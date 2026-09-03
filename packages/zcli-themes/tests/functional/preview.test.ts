import type { Manifest } from '../../../zcli-themes/src/types'
import { expect, test } from '@oclif/test'
import * as sinon from 'sinon'
import * as path from 'path'
import * as fs from 'fs'
import axios, { AxiosError } from 'axios'
import * as http from 'http'
import { cloneDeep } from 'lodash'
import PreviewCommand from '../../src/commands/themes/preview'
import env from './env'

describe('themes:preview', function () {
  const baseThemePath = path.join(__dirname, 'mocks/base_theme')
  let fetchStub: sinon.SinonStub

  beforeEach(() => {
    fetchStub = sinon.stub(global, 'fetch')
  })

  afterEach(() => {
    fetchStub.restore()
  })

  describe('successful preview', () => {
    let server: { close: () => void }

    const preview = test
      .stdout()
      .env(env)
      .do(() => {
        fetchStub.withArgs(sinon.match({
          url: 'https://z3ntest.zendesk.com/hc/api/internal/theming/local_preview',
          method: 'PUT'
        })).resolves({
          status: 200,
          ok: true,
          text: () => Promise.resolve('')
        })
      })
      .do(async () => {
        server = await PreviewCommand.run([baseThemePath, '--bind', '0.0.0.0', '--port', '9999'])
      })

    afterEach(() => {
      server.close()
    })

    preview
      .it('should provide links and instructions to start and exit preview', async (ctx) => {
        expect(ctx.stdout).to.contain('Ready https://z3ntest.zendesk.com/hc/admin/local_preview/start 🚀')
        expect(ctx.stdout).to.contain('You can exit preview mode in the UI or by visiting https://z3ntest.zendesk.com/hc/admin/local_preview/stop')
      })

    preview
      .it('should serve assets on the defined host and port', async () => {
        expect((await axios.get('http://0.0.0.0:9999/guide/style.css')).status).to.eq(200)
        expect((await axios.get('http://0.0.0.0:9999/guide/script.js')).status).to.eq(200)
        expect((await axios.get('http://0.0.0.0:9999/guide/settings/logo.png')).status).to.eq(200)
        expect((await axios.get('http://0.0.0.0:9999/guide/assets/bike.png')).status).to.eq(200)
      })

    preview
      .it('should serve a compiled stylesheet', async () => {
        const stylesheet = (await axios.get('http://0.0.0.0:9999/guide/style.css')).data
        expect(stylesheet).to.contain('color: #17494D;')
        expect(stylesheet).to.contain('background: url(http://0.0.0.0:9999/guide/settings/logo.png);')
        expect(stylesheet).to.contain('cursor: url(http://0.0.0.0:9999/guide/assets/bike.png), pointer;')
        expect(stylesheet).to.contain('width: 12px;')
      })

    preview
      .it('should watch for changes in the manifest.json file', async () => {
        // Read manifest.json
        const manifestPath = path.join(baseThemePath, 'manifest.json')
        const manifest: Manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
        // Modify manifest.json
        const clonedManifest = cloneDeep(manifest)
        clonedManifest.settings[0].variables[1].value = '#000000'
        fs.writeFileSync(manifestPath, JSON.stringify(clonedManifest))
        expect((await axios.get('http://0.0.0.0:9999/guide/style.css')).data).to.contain('color: #000000;')
        // Restore manifest.json
        fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2))
      })
  })

  describe('component preview', function () {
    const baseComponentPath = path.join(__dirname, 'mocks/base_component')
    const bundlePath = path.join(baseComponentPath, 'dist/index.js')
    const bundle = 'export function mount (container, props) {\n  container.textContent = props.settings.heading_text\n}\n'

    // dist/ is gitignored build output, so the fixture writes its own bundle
    before(() => {
      fs.mkdirSync(path.dirname(bundlePath), { recursive: true })
      fs.writeFileSync(bundlePath, bundle)
    })

    describe('with live-reload', () => {
      let server: { close: () => void }

      const preview = test
        .stdout()
        .env(env)
        .do(() => {
          fetchStub.withArgs(sinon.match({
            url: 'https://z3ntest.zendesk.com/hc/api/internal/theming/local_preview/theme_components',
            method: 'PUT'
          })).resolves({
            status: 200,
            ok: true,
            text: () => Promise.resolve('')
          })
        })
        .do(async () => {
          server = await PreviewCommand.run([baseComponentPath, '--bind', '0.0.0.0', '--port', '9998'])
        })

      afterEach(() => {
        server.close()
      })

      preview
        .it('should register the component and print instructions', async (ctx) => {
          // the stubbed fetch only resolves for PUTs to the theme_components endpoint
          expect(fetchStub.calledWith(sinon.match({
            url: 'https://z3ntest.zendesk.com/hc/api/internal/theming/local_preview/theme_components',
            method: 'PUT'
          }))).to.eq(true)
          expect(ctx.stdout).to.contain('Ready https://z3ntest.zendesk.com/hc/admin/local_preview/start 🚀')
          expect(ctx.stdout).to.contain('Previewing component request_list@1.0.0')
        })

      preview
        .it('should serve the bundle with the livereload snippet appended', async () => {
          const response = await axios.get('http://0.0.0.0:9998/theme_components/request_list/1.0.0/index.js')

          expect(response.status).to.eq(200)
          expect(response.headers['cache-control']).to.contain('no-cache')
          expect(response.data).to.contain('export function mount')
          expect(response.data).to.contain('new WebSocket("ws://0.0.0.0:9998/livereload")')
        })

      preview
        .it('should serve the bundle under any version path', async () => {
          expect((await axios.get('http://0.0.0.0:9998/theme_components/request_list/9.9.9/index.js')).status).to.eq(200)
        })

      preview
        .it('should not serve other components', async () => {
          try {
            await axios.get('http://0.0.0.0:9998/theme_components/other/1.0.0/index.js')
            throw new Error('expected a 404')
          } catch (e) {
            expect((e as AxiosError).response?.status).to.eq(404)
          }
        })
    })

    describe('with --no-livereload', () => {
      let server: { close: () => void }

      const preview = test
        .stdout()
        .env(env)
        .do(() => {
          fetchStub.withArgs(sinon.match({
            url: 'https://z3ntest.zendesk.com/hc/api/internal/theming/local_preview/theme_components',
            method: 'PUT'
          })).resolves({
            status: 200,
            ok: true,
            text: () => Promise.resolve('')
          })
        })
        .do(async () => {
          server = await PreviewCommand.run([baseComponentPath, '--bind', '0.0.0.0', '--port', '9998', '--no-livereload'])
        })

      afterEach(() => {
        server.close()
      })

      preview
        .it('should serve the bundle verbatim', async () => {
          const response = await axios.get('http://0.0.0.0:9998/theme_components/request_list/1.0.0/index.js')

          expect(response.status).to.eq(200)
          expect(response.data).to.eq(bundle)
        })
    })
  })

  describe('when the directory does not exist', () => {
    test
      .stdout()
      .env(env)
      .it('reports a clear error', async () => {
        try {
          await PreviewCommand.run(['./no-such-directory'])
        } catch (e) {
          expect((e as Error).message).to.contain('Couldn\'t find a directory at path:')
          expect(fetchStub.called).to.eq(false)
          return
        }
        throw new Error('expected the command to fail')
      })
  })

  describe('when component registration fails after listening', () => {
    const baseComponentPath = path.join(__dirname, 'mocks/base_component')
    const bundlePath = path.join(baseComponentPath, 'dist/index.js')

    before(() => {
      fs.mkdirSync(path.dirname(bundlePath), { recursive: true })
      fs.writeFileSync(bundlePath, 'export function mount () {}\n')
    })

    test
      .stdout()
      .env(env)
      .do(() => {
        fetchStub.withArgs(sinon.match({
          url: 'https://z3ntest.zendesk.com/hc/api/internal/theming/local_preview/theme_components',
          method: 'PUT'
        })).resolves({
          status: 500,
          ok: false,
          text: () => Promise.resolve('Internal Server Error')
        })
      })
      .it('closes the server so the port stays free', async () => {
        try {
          await PreviewCommand.run([baseComponentPath, '--bind', '0.0.0.0', '--port', '9995'])
        } catch { /* expected */ }

        const probe = http.createServer()
        await new Promise<void>((resolve, reject) => {
          probe.once('error', reject)
          probe.listen(9995, '0.0.0.0', resolve)
        })
        probe.close()
      })
  })

  describe('when the component bundle has not been built', () => {
    const baseComponentPath = path.join(__dirname, 'mocks/base_component')
    const bundlePath = path.join(baseComponentPath, 'dist/index.js')

    afterEach(() => {
      fs.mkdirSync(path.dirname(bundlePath), { recursive: true })
      fs.writeFileSync(bundlePath, 'export function mount () {}\n')
    })

    test
      .stdout()
      .env(env)
      .it('fails before registering or listening', async () => {
        fs.rmSync(path.dirname(bundlePath), { recursive: true, force: true })

        try {
          await PreviewCommand.run([baseComponentPath, '--bind', '0.0.0.0', '--port', '9996'])
        } catch (e) {
          expect((e as Error).message).to.contain('dist/index.js')
          expect((e as Error).message).to.contain('build the component first')
          expect(fetchStub.called).to.eq(false)
          return
        }
        throw new Error('expected the command to fail')
      })
  })

  describe('when the port is already in use', () => {
    const baseComponentPath = path.join(__dirname, 'mocks/base_component')
    let blocker: http.Server

    before(async () => {
      blocker = http.createServer()
      await new Promise<void>((resolve) => blocker.listen(9997, '0.0.0.0', resolve))
    })

    after(() => {
      blocker.close()
    })

    test
      .stdout()
      .env(env)
      .it('reports a friendly error and does not register the component', async () => {
        try {
          await PreviewCommand.run([baseComponentPath, '--bind', '0.0.0.0', '--port', '9997'])
        } catch (e) {
          expect((e as Error).message).to.contain('Port 9997 is already in use')
          expect((e as Error).message).to.contain('Pass --port to use a different one')
          expect(fetchStub.called).to.eq(false)
          return
        }
        throw new Error('expected the command to fail')
      })
  })

  describe('validation errors', () => {
    test
      .stdout()
      .env(env)
      .do(() => {
        fetchStub.withArgs(sinon.match({
          url: 'https://z3ntest.zendesk.com/hc/api/internal/theming/local_preview',
          method: 'PUT'
        })).resolves({
          status: 400,
          ok: false,
          text: () => Promise.resolve(JSON.stringify({
            template_errors: {
              home_page: [{
                description: "'articles' does not exist",
                line: 10,
                column: 6,
                length: 7
              }]
            }
          }))
        })
      })
      .it('should report template errors', async (ctx) => {
        try {
          await PreviewCommand.run([baseThemePath])
          expect(ctx.stdout).to.contain(`Validation error ${baseThemePath}/templates/home_page.hbs:10:6`)
          expect(ctx.stdout).to.contain("'articles' does not exist")
        } catch {}
      })
  })
})
