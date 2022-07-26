import { Command, Flags } from '@oclif/core'
import * as express from 'express'
import * as morgan from 'morgan'
import * as chalk from 'chalk'
import * as cors from 'cors'
import * as fs from 'fs'
import { buildAppJSON } from '../../lib/buildAppJSON'
import { Installation } from '../../types'
import { getAppPaths } from '../../utils/shared'

const logMiddleware = morgan((tokens, req, res) =>
  `${chalk.green(tokens.method(req, res))} ${tokens.url(req, res)} ${chalk.bold(tokens.status(req, res))}`
)

export default class Server extends Command {
  static description = 'serves apps in development mode'

  static flags = {
    help: Flags.help({ char: 'h' }),
    bind: Flags.string({ default: 'localhost', description: 'Bind apps server to a specific host' }),
    port: Flags.string({ default: '4567', description: 'Port for the http server to use' }),
    logs: Flags.boolean({ default: false, description: 'Tail logs' })
    // TODO: custom file is not supported for other commands,
    // lets come back to this in near future
    // config: flags.string({ default: 'zcli.apps.config.json', description: 'Configuration file for zcli::apps' })
  }

  static args = [
    { name: 'appDirectories', required: true, default: '.' }
  ]

  static examples = [
    '$ zcli apps:server ./repl-app2',
    '$ zcli apps:server ./repl-app2 ./knowledge-capture-app'
  ]

  static strict = false

  async run () {
    const { flags } = await this.parse(Server)
    const port = parseInt(flags.port)
    const { logs: tailLogs, bind: host } = flags
    const { argv: appDirectories } = await this.parse(Server)

    const appPaths = getAppPaths(appDirectories)
    let appJSON = await buildAppJSON(appPaths, port)

    const app = express()
    app.use(cors())
    tailLogs && app.use(logMiddleware)

    app.get('/app.json', (req, res) => {
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify(appJSON))
    })

    const setAppAssetsMiddleware = () => {
      appJSON.installations.forEach((installation: Installation, index: number) => {
        app.use(`/${installation.app_id}/assets`, express.static(`${appPaths[index]}/assets`))
      })
    }

    // Keep references of watchers for unwatching later
    const watchers = appPaths.map(appPath =>
      fs.watch(appPath, async (eventType, filename) => {
        if (filename.toLowerCase() === 'manifest.json') {
          // Regenerate app.json
          appJSON = await buildAppJSON(appPaths, port)
          // Reset middlewares for app assets
          setAppAssetsMiddleware()
        }
      }))

    // Set middlewares for app assets
    setAppAssetsMiddleware()

    const server = app.listen(port, host, () => {
      this.log(`\nApps server is running on ${chalk.green(`http://${host}:${port}`)} 🚀\n`)
      this.log(`Add ${chalk.bold('?zcli_apps=true')} to the end of your Zendesk URL to load these apps on your Zendesk account.\n`)
      tailLogs && this.log(chalk.bold('Tailing logs'))
    })

    return {
      close: () => {
        // Stop watching file changes before terminating the server
        watchers.forEach(watcher => watcher.close())
        server.close()
      }
    }
  }
}
