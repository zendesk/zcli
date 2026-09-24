import { expect, test } from '@oclif/test'
import * as sinon from 'sinon'
import * as path from 'path'
import * as fs from 'fs'
import * as os from 'os'
import axios, { AxiosError } from 'axios'
import * as http from 'http'
import PreviewCommand from '../../../src/commands/themes/components/preview'
import env from '../env'

describe('themes:components:preview', function () {
  const entry = 'export function mount (container, props) {\n  container.textContent = props.settings.heading_text\n}\n'
  const chunk = 'export function extra () {\n  return true\n}\n'
  const locale = '{"greeting":"hi"}'
  const metadata = JSON.stringify({
    ...JSON.parse(fs.readFileSync(path.join(__dirname, '../mocks/base_component/component.json'), 'utf8')),
    version: '1.0.0'
  })

  let componentPath: string
  let entryPath: string
  let chunkPath: string
  let localePath: string
  let metadataPath: string
  let fetchStub: sinon.SinonStub

  // A fresh component root per test: the command reads component.json and the entry directly from
  // the directory it is given, and one test deletes the entry.
  beforeEach(() => {
    componentPath = fs.mkdtempSync(path.join(os.tmpdir(), 'zcli-component-'))
    entryPath = path.join(componentPath, 'index.js')
    chunkPath = path.join(componentPath, 'chunks/extra-chunk.js')
    localePath = path.join(componentPath, 'locales/en-us.json')
    metadataPath = path.join(componentPath, 'component.json')

    const files: Array<[string, string]> = [
      [entryPath, entry],
      [chunkPath, chunk],
      [localePath, locale],
      [metadataPath, metadata]
    ]

    for (const [file, contents] of files) {
      fs.mkdirSync(path.dirname(file), { recursive: true })
      fs.writeFileSync(file, contents)
    }

    fetchStub = sinon.stub(global, 'fetch')
  })

  afterEach(() => {
    fetchStub.restore()
    fs.rmSync(componentPath, { recursive: true, force: true })
  })

  describe('successful preview', () => {
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
        server = await PreviewCommand.run([componentPath, '--bind', '0.0.0.0', '--port', '9990'])
      })

    afterEach(() => {
      server.close()
    })

    preview
      .it('registers the component and prints instructions', async (ctx) => {
        expect(fetchStub.calledWith(sinon.match({
          url: 'https://z3ntest.zendesk.com/hc/api/internal/theming/local_preview/theme_components',
          method: 'PUT'
        }))).to.eq(true)
        expect(ctx.stdout).to.contain('Ready https://z3ntest.zendesk.com/hc/admin/local_preview/start 🚀')
        expect(ctx.stdout).to.contain('Previewing component request_list@1.0.0')
      })

    preview
      .it('serves the entry verbatim, with no livereload snippet or socket', async () => {
        const response = await axios.get('http://0.0.0.0:9990/theme_components/request_list/1.0.0/index.js')

        expect(response.status).to.eq(200)
        expect(response.headers['cache-control']).to.contain('no-cache')
        expect(response.data).to.eq(entry)
        expect(response.data).not.to.contain('WebSocket')
      })

    preview
      .it('serves sibling assets verbatim', async () => {
        const chunkResponse = await axios.get('http://0.0.0.0:9990/theme_components/request_list/1.0.0/chunks/extra-chunk.js')
        expect(chunkResponse.data).to.eq(chunk)

        const localeResponse = await axios.get('http://0.0.0.0:9990/theme_components/request_list/1.0.0/locales/en-us.json')
        expect(localeResponse.data).to.deep.eq(JSON.parse(locale))
      })

    preview
      .it('serves the entry under any version path', async () => {
        expect((await axios.get('http://0.0.0.0:9990/theme_components/request_list/9.9.9/index.js')).status).to.eq(200)
      })

    preview
      .it('does not serve other components', async () => {
        try {
          await axios.get('http://0.0.0.0:9990/theme_components/other/1.0.0/index.js')
          throw new Error('expected a 404')
        } catch (e) {
          expect((e as AxiosError).response?.status).to.eq(404)
        }
      })
  })

  describe('when the directory does not exist', () => {
    test
      .stdout()
      .env(env)
      .it('reports a clear error and does not register', async () => {
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

  describe('when the directory has no entry', () => {
    test
      .stdout()
      .env(env)
      .it('fails before registering or listening', async () => {
        fs.rmSync(entryPath, { force: true })

        try {
          await PreviewCommand.run([componentPath, '--bind', '0.0.0.0', '--port', '9991'])
        } catch (e) {
          expect((e as Error).message).to.contain('index.js')
          expect(fetchStub.called).to.eq(false)
          return
        }
        throw new Error('expected the command to fail')
      })
  })

  describe('when component.json lacks a version', () => {
    test
      .stdout()
      .env(env)
      .it('reports a metadata error with no implicit version injection', async () => {
        fs.writeFileSync(metadataPath, JSON.stringify({ name: 'request_list' }))

        try {
          await PreviewCommand.run([componentPath, '--bind', '0.0.0.0', '--port', '9992'])
        } catch (e) {
          expect((e as Error).message).to.contain('must declare a "name" and a "version"')
          expect(fetchStub.called).to.eq(false)
          return
        }
        throw new Error('expected the command to fail')
      })
  })

  describe('when registration fails after listening', () => {
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
          await PreviewCommand.run([componentPath, '--bind', '0.0.0.0', '--port', '9993'])
        } catch { /* expected */ }

        const probe = http.createServer()
        await new Promise<void>((resolve, reject) => {
          probe.once('error', reject)
          probe.listen(9993, '0.0.0.0', resolve)
        })
        probe.close()
      })
  })

  describe('when the port is already in use', () => {
    let blocker: http.Server

    before(async () => {
      blocker = http.createServer()
      await new Promise<void>((resolve) => blocker.listen(9994, '0.0.0.0', resolve))
    })

    after(() => {
      blocker.close()
    })

    test
      .stdout()
      .env(env)
      .it('reports a friendly error and does not register the component', async () => {
        try {
          await PreviewCommand.run([componentPath, '--bind', '0.0.0.0', '--port', '9994'])
        } catch (e) {
          expect((e as Error).message).to.contain('Port 9994 is already in use')
          expect((e as Error).message).to.contain('Pass --port to use a different one')
          expect(fetchStub.called).to.eq(false)
          return
        }
        throw new Error('expected the command to fail')
      })
  })
})
