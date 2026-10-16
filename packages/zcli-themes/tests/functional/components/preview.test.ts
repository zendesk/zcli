import { expect, test } from '@oclif/test'
import * as sinon from 'sinon'
import * as path from 'path'
import * as fs from 'fs'
import * as os from 'os'
import axios, { AxiosError } from 'axios'
import * as http from 'http'
import { EventEmitter } from 'events'
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

  // Ports are allocated dynamically so tests never collide with other processes on the machine.
  const listenPort = (server: http.Server, port = 0): Promise<number> =>
    new Promise((resolve, reject) => {
      server.once('error', reject)
      server.listen(port, '0.0.0.0', () => {
        const { port: assigned } = server.address() as { port: number }
        resolve(assigned)
      })
    })

  const freePort = async (): Promise<number> => {
    const probe = http.createServer()
    const port = await listenPort(probe)
    probe.close()
    return port
  }

  afterEach(() => {
    fetchStub.restore()
    fs.rmSync(componentPath, { recursive: true, force: true })
  })

  describe('successful preview', () => {
    let server: { close: () => void } | undefined
    let port: number

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
        port = await freePort()
        server = await PreviewCommand.run([componentPath, '--bind', '0.0.0.0', '--port', String(port)])
      })

    afterEach(() => {
      server?.close()
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
        const response = await axios.get(`http://0.0.0.0:${port}/theme_components/request_list/1.0.0/index.js`)

        expect(response.status).to.eq(200)
        expect(response.headers['cache-control']).to.contain('no-cache')
        expect(response.data).to.eq(entry)
        expect(response.data).not.to.contain('WebSocket')
      })

    preview
      .it('serves sibling assets verbatim', async () => {
        const chunkResponse = await axios.get(`http://0.0.0.0:${port}/theme_components/request_list/1.0.0/chunks/extra-chunk.js`)
        expect(chunkResponse.data).to.eq(chunk)

        const localeResponse = await axios.get(`http://0.0.0.0:${port}/theme_components/request_list/1.0.0/locales/en-us.json`)
        expect(localeResponse.data).to.deep.eq(JSON.parse(locale))
      })

    preview
      .it('serves the entry under any version path', async () => {
        expect((await axios.get(`http://0.0.0.0:${port}/theme_components/request_list/9.9.9/index.js`)).status).to.eq(200)
      })

    preview
      .it('does not serve other components', async () => {
        try {
          await axios.get(`http://0.0.0.0:${port}/theme_components/other/1.0.0/index.js`)
          throw new Error('expected a 404')
        } catch (e) {
          expect((e as AxiosError).response?.status).to.eq(404)
        }
      })

    preview
      .it('deregisters its session on SIGINT', async () => {
        const deregistration = sinon.match({
          url: sinon.match(/theme_components\/request_list\?session_id=\S+/),
          method: 'DELETE'
        })
        fetchStub.withArgs(deregistration).resolves({ status: 200, ok: true, text: () => Promise.resolve('') })

        const exit = sinon.stub(process, 'exit').returns(undefined as unknown as never)

        try {
          (process as unknown as EventEmitter).emit('SIGINT')

          const deadline = Date.now() + 1000
          while (!exit.calledWith(130) || !fetchStub.calledWith(deregistration)) {
            if (Date.now() > deadline) throw new Error('timed out waiting for the SIGINT cleanup')
            await new Promise(resolve => setTimeout(resolve, 10))
          }
        } finally {
          exit.restore()
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
          await PreviewCommand.run([componentPath, '--bind', '0.0.0.0'])
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
          await PreviewCommand.run([componentPath, '--bind', '0.0.0.0'])
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
        const port = await freePort()

        try {
          await PreviewCommand.run([componentPath, '--bind', '0.0.0.0', '--port', String(port)])
        } catch { /* expected */ }

        const probe = http.createServer()
        await listenPort(probe, port)
        probe.close()
      })
  })

  describe('when the port is already in use', () => {
    test
      .stdout()
      .env(env)
      .it('reports a friendly error and does not register the component', async () => {
        const blocker = http.createServer()
        const port = await listenPort(blocker)

        try {
          await PreviewCommand.run([componentPath, '--bind', '0.0.0.0', '--port', String(port)])
        } catch (e) {
          expect((e as Error).message).to.contain(`Port ${port} is already in use`)
          expect((e as Error).message).to.contain('Pass --port to use a different one')
          expect(fetchStub.called).to.eq(false)
          blocker.close()
          return
        }
        blocker.close()
        throw new Error('expected the command to fail')
      })
  })
})
