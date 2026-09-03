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
import preview from '../../lib/preview'
import previewComponent from '../../lib/previewComponent'
import getComponent from '../../lib/getComponent'
import appendLivereloadSnippet from '../../lib/appendLivereloadSnippet'
import getManifest from '../../lib/getManifest'
import getVariables from '../../lib/getVariables'
import getAssets from '../../lib/getAssets'
import zass from '../../lib/zass'
import { request } from '@zendesk/zcli-core'
import type { Flags as PreviewFlags } from '../../types'
import { getLocalServerBaseUrl } from '../../lib/getLocalServerBaseUrl'

const logMiddleware = morgan((tokens, req, res) =>
  `${chalk.green(tokens.method(req, res))} ${tokens.url(req, res)} ${chalk.bold(tokens.status(req, res))}`
)

export default class Preview extends Command {
  static description = 'preview a theme or theme component in development mode'

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
    '$ zcli themes:preview ./copenhagen_theme',
    '$ zcli themes:preview ./help-center-components/components/request-list'
  ]

  static strict = false

  async run () {
    const { flags, argv: [directory] } = await this.parse(Preview)
    const targetPath = path.resolve(directory)

    if (!fs.existsSync(targetPath)) {
      this.error(`Couldn't find a directory at path: "${targetPath}"`)
    }

    const hasManifest = fs.existsSync(`${targetPath}/manifest.json`)
    const hasComponent = fs.existsSync(`${targetPath}/component.json`)

    if (hasManifest && hasComponent) {
      this.error('Directory contains both manifest.json and component.json — preview the theme and the component from separate directories')
    }

    return hasComponent ? this.previewComponent(targetPath, flags) : this.previewTheme(targetPath, flags)
  }

  private async previewTheme (themePath: string, flags: PreviewFlags) {
    const { logs: tailLogs } = flags

    const baseUrl = await preview(themePath, flags)
    const { app, server, wss } = this.createServer(flags)

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

    await this.listen(server, wss, flags)

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

  private async previewComponent (componentPath: string, flags: PreviewFlags) {
    const { logs: tailLogs } = flags

    let component = getComponent(componentPath)

    if (!fs.existsSync(`${componentPath}/dist/index.js`)) {
      this.error(`Couldn't find a bundle at path: "${componentPath}/dist/index.js" — build the component first`)
    }

    const { app, server, wss } = this.createServer(flags)

    app.get('/theme_components/:name/:version/index.js', (req, res) => {
      const bundle = path.resolve(`${componentPath}/dist/index.js`)

      // The version segment is ignored on purpose: the bundle on disk is the
      // one being developed, whatever version a cached page may still request.
      if (req.params.name !== component.name || !fs.existsSync(bundle)) {
        res.sendStatus(404)
        return
      }

      const source = fs.readFileSync(bundle, 'utf8')
      const label = `${component.name}@${component.version}`

      res.header('Content-Type', 'text/javascript')
      res.header('Cache-Control', 'no-cache')
      res.send(flags.livereload ? appendLivereloadSnippet(source, getLocalServerBaseUrl(flags, true), label) : source)
    })

    // Listen before registering so a failed start leaves no registration
    // pointing at a server that is not ours.
    await this.listen(server, wss, flags)

    let baseUrl
    try {
      baseUrl = await previewComponent(componentPath, flags)
    } catch (e) {
      wss.close()
      server.close()
      throw e
    }

    this.log(chalk.bold.green('Ready', chalk.blueBright(`${baseUrl}/hc/admin/local_preview/start`, '🚀')))
    this.log(`Previewing component ${chalk.bold(`${component.name}@${component.version}`)} — the rendered theme must call {{component '${component.name}'}}`)
    this.log(`You can exit preview mode in the UI or by visiting ${baseUrl}/hc/admin/local_preview/stop`)
    tailLogs && this.log(chalk.bold('Tailing logs'))

    const monitoredPaths = [
      `${componentPath}/component.json`,
      `${componentPath}/dist`
    ]

    const handleComponentChange = async (changedPath: string) => {
      this.log(chalk.bold('Change'), changedPath)
      if (changedPath === path.join(componentPath, 'component.json')) {
        try {
          const next = getComponent(componentPath)
          await previewComponent(componentPath, flags)
          component = next
        } catch (e) {
          this.error(e as Error, { exit: false })
          return
        }
      }
      this.broadcastReload(wss)
    }

    const watcher = chokidar.watch(monitoredPaths, { ignoreInitial: true })
      .on('add', handleComponentChange)
      .on('change', handleComponentChange)
      .on('unlink', handleComponentChange)

    const close = () => {
      // Stop watching file changes before terminating the server
      watcher.close()
      server.close()
      wss.close()
    }

    const onExitSignal = async () => {
      await this.deregister(`/hc/api/internal/theming/local_preview/theme_components/${encodeURIComponent(component.name)}`)
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

  private createServer (flags: PreviewFlags) {
    const { logs: tailLogs, 'https-cert': httpsCert, 'https-key': httpsKey } = flags

    let httpsServerOptions: https.ServerOptions | null = null

    if (httpsCert && httpsKey) {
      httpsServerOptions = {
        key: fs.readFileSync(httpsKey),
        cert: fs.readFileSync(httpsCert)
      }
    }

    const app = express()
    const server = httpsServerOptions === null ? http.createServer(app) : https.createServer(httpsServerOptions, app)
    const wss = new WebSocket.Server({ server, path: '/livereload' })

    app.use(cors())
    tailLogs && app.use(logMiddleware)

    return { app, server, wss }
  }

  private async listen (server: http.Server | https.Server, wss: WebSocket.Server, flags: PreviewFlags): Promise<void> {
    try {
      // ws forwards server errors as its own 'error' event, which would crash
      // the process without a listener.
      await new Promise<void>((resolve, reject) => {
        const onError = (error: Error) => reject(error)
        server.once('error', onError)
        wss.once('error', onError)
        server.listen(flags.port, flags.bind, () => {
          server.removeListener('error', onError)
          wss.removeListener('error', onError)
          resolve()
        })
      })
    } catch (e) {
      if ((e as { code?: string }).code === 'EADDRINUSE') {
        this.error(`Port ${flags.port} is already in use — another preview session may be running. Pass --port to use a different one`)
      }
      throw e
    }
  }

  // Best effort: any status (or a dead network) is fine — the session is ending
  // anyway and the server-side TTL is the backstop.
  private async deregister (path: string): Promise<void> {
    try {
      await request.requestAPI(path, {
        method: 'delete',
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
