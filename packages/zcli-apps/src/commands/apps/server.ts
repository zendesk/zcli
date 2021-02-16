import { Command, flags } from '@oclif/command'
import * as express from 'express'
import * as morgan from 'morgan'
import * as chalk from 'chalk'
import * as cors from 'cors'
import { buildAppJSON } from '../../lib/buildAppJSON'
import { Installation } from '../../types'
import { getAppPaths } from '../../utils/shared'
import { DEFAULT_APPS_CONFIG_FILE } from '../../constants'

const logMiddleware = morgan((tokens, req, res) =>
  `${chalk.green(tokens.method(req, res))} ${tokens.url(req, res)} ${chalk.bold(tokens.status(req, res))}`
)

export default class Server extends Command {
  static description = 'serves apps in development mode'

  static flags = {
    help: flags.help({ char: 'h' }),
    bind: flags.string({ default: 'localhost', description: 'Bind apps server to a specific host' }),
    port: flags.string({ default: '4567', description: 'Port for the http server to use' }),
    logs: flags.boolean({ default: false, description: 'Tail logs' })
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
    const { flags } = this.parse(Server)
    const port = parseInt(flags.port)
    const config = DEFAULT_APPS_CONFIG_FILE
    const { logs: tailLogs, bind: host } = flags
    const { argv: appDirectories } = this.parse(Server)

    const appPaths = getAppPaths(appDirectories)
    const appJSON = await buildAppJSON(appPaths, port, config)

    const app = express()
    app.use(cors())
    tailLogs && app.use(logMiddleware)

    app.get('/app.json', (req, res) => {
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify(appJSON))
    })

    appJSON.installations.forEach((installation: Installation, index: number) => {
      app.use(`/${installation.app_id}/assets`, express.static(`${appPaths[index]}/assets`))
    })

    return app.listen(port, host, () => {
      this.log(`\nApps server is running on ${chalk.green(`http://${host}:${port}`)} 🚀\n`)
      this.log(`Add ${chalk.bold('?zcli_apps=true')} to the end of your Zendesk URL to load these apps on your Zendesk account.\n`)
      tailLogs && this.log(chalk.bold('Tailing logs'))
    })
  }
}
