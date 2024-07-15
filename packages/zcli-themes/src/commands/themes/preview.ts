import { Command, Flags } from '@oclif/core'
import * as path from 'path'
import * as fs from 'fs'
import * as express from 'express'
import * as http from 'http'
import * as https from 'https'
import * as WebSocket from 'ws'
import * as morgan from 'morgan'
import * as chalk from 'chalk'
import * as cors from 'cors'
import * as chokidar from 'chokidar'
import { Auth, getBaseUrl } from '@zendesk/zcli-core'
import preview from '../../lib/preview'
import getManifest from '../../lib/getManifest'
import getVariables from '../../lib/getVariables'
import getAssets from '../../lib/getAssets'
import zass from '../../lib/zass'

const logMiddleware = morgan((tokens, req, res) =>
  `${chalk.green(tokens.method(req, res))} ${tokens.url(req, res)} ${chalk.bold(tokens.status(req, res))}`
)

export default class Preview extends Command {
  static description = 'preview a theme in development mode'

  static flags = {
    bind: Flags.string({ default: 'localhost', description: 'Bind theme server to a specific host' }),
    port: Flags.integer({ default: 4567, description: 'Port for the http server to use' }),
    logs: Flags.boolean({ default: false, description: 'Tail logs' }),
    livereload: Flags.boolean({ default: true, description: 'Enable or disable live-reloading the preview when a change is made', allowNo: true }),
    'https-cert': Flags.file({ description: 'Certificate used to start the server in HTTPS mode' }),
    'https-key': Flags.file({ description: 'Key used to start the server in HTTPS mode' })
  }

  static args = [
    { name: 'themeDirectory', required: true, default: '.' }
  ]

  static examples = [
    '$ zcli themes:preview ./copenhagen_theme'
  ]

  static strict = false

  async run () {
    const { flags, argv: [themeDirectory] } = await this.parse(Preview)
    const themePath = path.resolve(themeDirectory)
    const { logs: tailLogs, bind: host, port, 'https-cert': httpsCert, 'https-key': httpsKey } = flags

    let httpsServerOptions: https.ServerOptions | null = null

    if (httpsCert && httpsKey) {
      httpsServerOptions = {
        key: fs.readFileSync(httpsKey),
        cert: fs.readFileSync(httpsCert)
      }
    }

    await preview(themePath, flags)

    const app = express()
    const server = httpsServerOptions === null ? http.createServer(app) : https.createServer(httpsServerOptions, app)
    const wss = new WebSocket.Server({ server, path: '/livereload' })

    app.use(cors())
    tailLogs && app.use(logMiddleware)

    app.use('/guide/assets', express.static(`${themePath}/assets`))
    app.use('/guide/settings', express.static(`${themePath}/settings`))

    app.get('/guide/script.js', (req, res) => {
      const script = path.resolve(`${themePath}/script.js`)
      const source = fs.readFileSync(script, 'utf8')
      res.header('Content-Type', 'text/javascript')
      res.send(source)
    })

    app.get('/guide/style.css', (req, res) => {
      const style = path.resolve(`${themePath}/style.css`)
      const source = fs.readFileSync(style, 'utf8')
      const manifest = getManifest(themePath)
      const variables = getVariables(themePath, manifest.settings, flags)
      const assets = getAssets(themePath, flags)
      const compiled = zass(source, variables, assets)
      res.header('Content-Type', 'text/css')
      res.send(compiled)
    })

    server.listen(port, host, async () => {
      // preview requires authentication so we're sure
      // to have a logged in profile at this point
      const { subdomain, domain } = await new Auth().getLoggedInProfile()
      const baseUrl = getBaseUrl(subdomain, domain)
      this.log(chalk.bold.green('Ready', chalk.blueBright(`${baseUrl}/hc/admin/local_preview/start`, '🚀')))
      this.log(`You can exit preview mode in the UI or by visiting ${baseUrl}/hc/admin/local_preview/stop`)
      tailLogs && this.log(chalk.bold('Tailing logs'))
    })

    const monitoredPaths = [
      `${themePath}/assets`,
      `${themePath}/settings`,
      `${themePath}/templates`,
      `${themePath}/manifest.json`,
      `${themePath}/script.js`,
      `${themePath}/style.css`
    ]

    const watcher = chokidar.watch(monitoredPaths).on('change', async (path) => {
      this.log(chalk.bold('Change'), path)
      try {
        await preview(themePath, flags)
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send('reload')
          }
        })
      } catch (e) {
        this.error(e as Error, { exit: false })
      }
    })

    return {
      close: () => {
        // Stop watching file changes before terminating the server
        watcher.close()
        server.close()
        wss.close()
      }
    }
  }
}
