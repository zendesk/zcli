import { Command, Flags } from '@oclif/core'
import { CLIError } from '@oclif/core/lib/errors'
import * as path from 'path'
import * as fs from 'fs'
import * as express from 'express'
import * as morgan from 'morgan'
import * as chalk from 'chalk'
import * as cors from 'cors'
import getRuntimeContext from '../../lib/getRuntimeContext'
import preview from '../../lib/preview'
import getManifest from '../../lib/getManifest'
import getVariables from '../../lib/getVariables'
import getAssets from '../../lib/getAssets'
import zass from '../../lib/zass'

const logMiddleware = morgan((tokens, req, res) =>
  `${chalk.green(tokens.method(req, res))} ${tokens.url(req, res)} ${chalk.bold(tokens.status(req, res))}`
)

export default class Server extends Command {
  static description = 'preview a theme in development mode'

  static flags = {
    bind: Flags.string({ default: 'localhost', description: 'Bind theme server to a specific host' }),
    port: Flags.integer({ default: 4567, description: 'Port for the http server to use' }),
    logs: Flags.boolean({ default: false, description: 'Tail logs' }),
    subdomain: Flags.string({ description: 'Account subdomain or full URL (including protocol)' }),
    username: Flags.string({ description: 'Account username (email)' }),
    password: Flags.string({ description: 'Account password' })
  }

  static args = [
    { name: 'themeDirectory', required: true, default: '.' }
  ]

  static examples = [
    '$ zcli theme:preview ./copenhagen_theme'
  ]

  static strict = false

  async run () {
    const { flags, argv: [themeDirectory] } = await this.parse(Server)
    const themePath = path.resolve(themeDirectory)
    const context = await getRuntimeContext(themePath, flags)
    const { logs: tailLogs, port, host, origin } = context

    if (!await preview(themePath, context)) {
      throw new CLIError('Unable to start preview')
    }

    const app = express()
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
      const variables = getVariables(themePath, manifest.settings, context)
      const assets = getAssets(themePath, context)
      const compiled = zass(source, variables, assets)
      res.header('Content-Type', 'text/css')
      res.send(compiled)
    })

    const server = app.listen(port, host, () => {
      console.log(chalk.bold.green('Ready', chalk.blueBright(`${origin}/hc/admin/local_preview/start`, '🚀')))
      console.log(`You can exit preview mode in the UI or by visiting ${origin}/hc/admin/local_preview/stop`)
      tailLogs && this.log(chalk.bold('Tailing logs'))
    })

    const monitoredPaths = [
      `${themePath}/manifest.json`,
      `${themePath}/templates`
    ]

    // Keep references of watchers for unwatching later
    const watchers = monitoredPaths.map(path =>
      fs.watch(path, { recursive: true }, async (eventType, filename) => {
        console.log(chalk.bold.gray('Change'), filename)
        await preview(themePath, context)
      }))

    return {
      close: () => {
        // Stop watching file changes before terminating the server
        watchers.forEach(watcher => watcher.close())
        server.close()
      }
    }
  }
}
