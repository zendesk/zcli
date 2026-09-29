import { Command, Flags } from '@oclif/core'
import * as path from 'path'
import * as fs from 'fs'
import * as express from 'express'
import * as chalk from 'chalk'
import { randomUUID } from 'crypto'
import previewComponent from '../../../lib/previewComponent'
import getComponent from '../../../lib/getComponent'
import { createServer, listen } from '../../../lib/server'
import { request } from '@zendesk/zcli-core'

export default class Preview extends Command {
  static description = 'preview a theme component in development mode'

  static hidden = true

  static flags = {
    bind: Flags.string({ default: 'localhost', description: 'Bind the component server to a specific host' }),
    port: Flags.integer({ default: 4567, description: 'Port for the http server to use' }),
    logs: Flags.boolean({ default: false, description: 'Tail logs' }),
    'https-cert': Flags.file({ description: 'Certificate used to start the server in HTTPS mode' }),
    'https-key': Flags.file({ description: 'Key used to start the server in HTTPS mode' })
  }

  static args = [
    { name: 'directory', required: true, default: '.' }
  ]

  static examples = [
    '$ zcli themes:components:preview ./theme_component'
  ]

  static strict = false

  async run () {
    const { flags, argv: [directory] } = await this.parse(Preview)
    const componentPath = path.resolve(directory)

    if (!fs.existsSync(componentPath)) {
      this.error(`Couldn't find a directory at path: "${componentPath}"`)
    }

    const entryPath = path.join(componentPath, 'index.js')
    if (!fs.existsSync(entryPath)) {
      this.error(`Couldn't find an entry at path: "${entryPath}"`)
    }

    // Metadata is read and validated once at startup; changing it requires a restart.
    const component = getComponent(componentPath)
    const sessionId = randomUUID()

    const { app, server } = createServer(flags)

    const componentRoutes = express.Router()
    // Serve whole directory tree
    componentRoutes.use(express.static(componentPath, {
      setHeaders: (res) => res.header('Cache-Control', 'no-cache')
    }))

    // The rendered page loads the component from the src we register — /theme_components/<name>/
    // <version>/index.js — so the server must answer that path. Only this component's name is
    // served; the version segment is ignored because the on-disk tree is the one being developed.
    app.use('/theme_components/:name/:version', (req, res, next) => {
      if (req.params.name !== component.name) {
        res.sendStatus(404)
        return
      }
      next()
    }, componentRoutes)

    // Listen before registering so a failed start leaves no registration pointing at a server
    // that is not ours, and an occupied port never mutates remote preview state.
    await listen(server, flags)

    let baseUrl
    try {
      baseUrl = await previewComponent(component, sessionId, flags)
    } catch (e) {
      server.close()
      throw e
    }

    this.log(chalk.bold.green('Ready', chalk.blueBright(`${baseUrl}/hc/admin/local_preview/start`, '🚀')))
    this.log(`Previewing component ${chalk.bold(`${component.name}@${component.version}`)} — the rendered theme must call {{component '${component.name}'}}`)
    this.log('Rebuild and refresh the browser to see JS/asset changes; restart this command after metadata changes')
    this.log(`You can exit preview mode in the UI or by visiting ${baseUrl}/hc/admin/local_preview/stop`)
    flags.logs && this.log(chalk.bold('Tailing logs'))

    const onExitSignal = async () => {
      await this.deregister(component.name, sessionId)
      server.close()
      process.exit(130)
    }

    process.once('SIGINT', onExitSignal)
    process.once('SIGTERM', onExitSignal)

    return {
      close: () => {
        process.off('SIGINT', onExitSignal)
        process.off('SIGTERM', onExitSignal)
        server.close()
      }
    }
  }

  // Session-scoped cleanup, bounded so Ctrl-C is never held open by a hanging request; the
  // server-side TTL is the backstop if this best-effort call does not land.
  private async deregister (name: string, sessionId: string): Promise<void> {
    try {
      await request.requestAPI(`/hc/api/internal/theming/local_preview/theme_components/${encodeURIComponent(name)}`, {
        method: 'delete',
        params: { session_id: sessionId },
        timeout: 3000,
        headers: {
          'X-Zendesk-Request-Originator': 'zcli themes:components:preview'
        }
      })
    } catch { /* best effort */ }
  }
}
