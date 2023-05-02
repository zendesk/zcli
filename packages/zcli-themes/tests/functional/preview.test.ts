import type { Manifest } from '../../../zcli-themes/src/types'
import { expect, test } from '@oclif/test'
import * as path from 'path'
import * as fs from 'fs'
import * as nock from 'nock'
import axios from 'axios'
import { cloneDeep } from 'lodash'
import PreviewCommand from '../../src/commands/themes/preview'

describe('themes:preview', function () {
  const baseThemePath = path.join(__dirname, 'mocks/base_theme')

  describe('successful preview', () => {
    let server
    before(async () => {
      nock('https://z3ntest.zendesk.com').persist().put('/hc/api/internal/theming/local_preview').reply(200)
      server = await PreviewCommand.run([baseThemePath, '--bind', '0.0.0.0', '--port', '9999'])
    })

    after(() => {
      server.close()
      nock.cleanAll()
    })

    test
      .it('should serve assets on the defined host and port', async () => {
        expect((await axios.get('http://0.0.0.0:9999/guide/style.css')).status).to.eq(200)
        expect((await axios.get('http://0.0.0.0:9999/guide/script.js')).status).to.eq(200)
        expect((await axios.get('http://0.0.0.0:9999/guide/settings/logo.png')).status).to.eq(200)
        expect((await axios.get('http://0.0.0.0:9999/guide/assets/bike.png')).status).to.eq(200)
      })

    test
      .it('should serve a compiled stylesheet', async () => {
        const stylesheet = (await axios.get('http://0.0.0.0:9999/guide/style.css')).data
        expect(stylesheet).to.contain('color: #17494D;')
        expect(stylesheet).to.contain('background: url("http://0.0.0.0:9999/guide/settings/logo.png");')
        expect(stylesheet).to.contain('cursor: url("http://0.0.0.0:9999/guide/assets/bike.png"), pointer;')
        expect(stylesheet).to.contain('width: 12px;')
      })

    test
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
      .it('should report template errors', async (ctx) => {
        nock('https://z3ntest.zendesk.com').put('/hc/api/internal/theming/local_preview').reply(400, {
          template_errors: {
            home_page: [{
              description: "'searcsh' does not exist",
              line: 10,
              column: 6,
              length: 7
            }]
          }
        })

        try {
          await PreviewCommand.run([baseThemePath])
        } catch {
          expect(ctx.stdout).to.contain("Validation error home_page L10:6: 'searcsh' does not exist")
        } finally {
          nock.cleanAll()
        }
      })
  })
})
