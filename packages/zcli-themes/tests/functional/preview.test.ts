import type { Manifest } from '../../../zcli-themes/src/types'
import { expect, test } from '@oclif/test'
import * as sinon from 'sinon'
import * as path from 'path'
import * as fs from 'fs'
import axios from 'axios'
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
    let server

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
