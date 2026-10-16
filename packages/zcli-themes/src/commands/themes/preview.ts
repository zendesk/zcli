import { Command, Flags } from '@oclif/core'
import * as path from 'path'
import * as fs from 'fs'
import * as express from 'express'
import * as WebSocket from 'ws'
import * as chalk from 'chalk'
import * as chokidar from 'chokidar'
import preview from '../../lib/preview'
import getManifest from '../../lib/getManifest'
import getVariables from '../../lib/getVariables'
import getAssets from '../../lib/getAssets'
import zass from '../../lib/zass'
import { createServer, listen } from '../../lib/server'
import { request } from '@zendesk/zcli-core'

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
    { name: 'directory', required: true, default: '.' }
  ]

  static examples = [
    '$ zcli themes:preview ./copenhagen_theme'
  ]

  static strict = false

  async run () {
    const { flags, argv: [directory] } = await this.parse(Preview)
    const themePath = path.resolve(directory)

    if (!fs.existsSync(themePath)) {
      this.error(`Couldn't find a directory at path: "${themePath}"`)
    }

    const { logs: tailLogs } = flags
    const { app, server } = createServer(flags)
    const wss = new WebSocket.Server({ server, path: '/livereload' })
    // ws re-emits http server errors (e.g. EADDRINUSE) as its own 'error'; without a listener that
    // would crash the process. listen() surfaces the failure via the server itself.
    wss.on('error', () => { /* surfaced via the server's own error above */ })

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

    // Listen before uploading so an occupied port never mutates remote preview state.
    await listen(server, flags)

    let baseUrl
    try {
      baseUrl = await preview(themePath, flags)
    } catch (e) {
      wss.close()
      server.close()
      throw e
    }

    this.log(chalk.bold.green('Ready', chalk.blueBright(`${baseUrl}/hc/admin/local_preview/start`, '🚀')))
    this.log(`You can exit preview mode in the UI or by visiting ${baseUrl}/hc/admin/local_preview/stop`)
    tailLogs && this.log(chalk.bold('Tailing logs'))

    const monitoredPaths = [
      `${themePath}/assets`,
      `${themePath}/settings`,
      `${themePath}/templates`,
      `${themePath}/manifest.json`,
      `${themePath}/script.js`,
      `${themePath}/style.css`
    ]

    const handleThemeChange = async (path: string) => {
      this.log(chalk.bold('Change'), path)
      try {
        await preview(themePath, flags)
        this.broadcastReload(wss)
      } catch (e) {
        this.error(e as Error, { exit: false })
      }
    }

    const watcher = chokidar.watch(monitoredPaths, { ignoreInitial: true })
      .on('add', handleThemeChange)
      .on('change', handleThemeChange)
      .on('unlink', handleThemeChange)

    const close = () => {
      // Stop watching file changes before terminating the server
      watcher.close()
      server.close()
      wss.close()
    }

    const onExitSignal = async () => {
      await this.deregister('/hc/api/internal/theming/local_preview')
      close()
      process.exit(130)
    }

    process.once('SIGINT', onExitSignal)
    process.once('SIGTERM', onExitSignal)

    return {
      close: () => {
        process.off('SIGINT', onExitSignal)
        process.off('SIGTERM', onExitSignal)
        close()
      }
    }
  }

  // Best effort: any status (or a dead network) is fine — the session is ending
  // anyway and the server-side TTL is the backstop.
  private async deregister (path: string): Promise<void> {
    try {
      await request.requestAPI(path, {
        method: 'delete',
        timeout: 3000,
        headers: {
          'X-Zendesk-Request-Originator': 'zcli themes:preview'
        }
      })
    } catch { /* best effort */ }
  }

  private broadcastReload (wss: WebSocket.Server) {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send('reload')
      }
    })
  }
}
