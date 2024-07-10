import * as sinon from 'sinon'
import { expect } from '@oclif/test'
import * as getManifest from './getManifest'
import * as getTemplates from './getTemplates'
import * as getVariables from './getVariables'
import * as getAssets from './getAssets'
import * as axios from 'axios'
import { request } from '@zendesk/zcli-core'
import * as errors from '@oclif/core/lib/errors'
import preview, { livereloadScript } from './preview'

const manifest = {
  name: 'Copenhagen theme',
  author: 'Jane Doe',
  version: '1.0.1',
  api_version: 1,
  settings: [{
    variables: [
      { identifier: 'color', type: 'color', value: '#999' },
      { identifier: 'logo', type: 'file' }
    ]
  }]
}

const flags = {
  bind: 'localhost',
  port: 1000,
  logs: true,
  livereload: true
}

describe('preview', () => {
  beforeEach(() => {
    sinon.restore()
  })

  it('calls the local_preview endpoint with the correct payload and returns the used baseURL', async () => {
    const getManifestStub = sinon.stub(getManifest, 'default')
    const getTemplatesStub = sinon.stub(getTemplates, 'default')
    const getVariablesStub = sinon.stub(getVariables, 'default')
    const getAssetsStub = sinon.stub(getAssets, 'default')
    const requestStub = sinon.stub(request, 'requestAPI')

    getManifestStub.withArgs('theme/path').returns(manifest)
    getTemplatesStub.withArgs('theme/path').returns({
      home_page: '<h1>Home</h1>',
      document_head: '<meta charset="utf-8">',
      'article_pages/product_updates': '<h1>Product updates</h1>',
      'custom_pages/faq': '<h1>FAQ</h1>'
    })

    getVariablesStub.withArgs('theme/path', manifest.settings, flags).returns([
      { identifier: 'color', type: 'color', value: '#999' },
      { identifier: 'logo', type: 'file', value: 'http://localhost:1000/guide/settings/logo.png' }
    ])

    getAssetsStub.withArgs('theme/path', flags).returns([
      [
        { base: 'background.png', dir: '', ext: '.png', name: 'background', root: '' },
        'http://localhost:1000/guide/assets/background.png'
      ]
    ])

    requestStub.returns(Promise.resolve({
      status: 200,
      statusText: 'OK',
      config: { baseURL: 'https://z3ntest.zendesk.com' }
    }) as axios.AxiosPromise)

    const baseUrl = await preview('theme/path', flags)

    expect(requestStub.calledWith('/hc/api/internal/theming/local_preview', sinon.match({
      method: 'put',
      headers: {
        'X-Zendesk-Request-Originator': 'zcli themes:preview'
      },
      data: {
        templates: {
          home_page: '<h1>Home</h1>',
          'article_pages/product_updates': '<h1>Product updates</h1>',
          'custom_pages/faq': '<h1>FAQ</h1>',
          css: '',
          js: '',
          document_head: `
            <link rel="stylesheet" href="http://localhost:1000/guide/style.css">
            <meta charset="utf-8">
            <script src="http://localhost:1000/guide/script.js"></script>
            ${livereloadScript(flags)}
          `,
          assets: { 'background.png': 'http://localhost:1000/guide/assets/background.png' },
          variables: { color: '#999', logo: 'http://localhost:1000/guide/settings/logo.png' },
          metadata: { api_version: 1 }
        }
      }
    }))).to.equal(true)

    expect(baseUrl).to.equal('https://z3ntest.zendesk.com')
  })

  it('throws a comprehensive error when validation fails', async () => {
    sinon.stub(getManifest, 'default').returns(manifest)
    sinon.stub(getTemplates, 'default').returns({})
    sinon.stub(getVariables, 'default').returns([])
    sinon.stub(getAssets, 'default').returns([])

    sinon.stub(request, 'requestAPI').throws({
      response: {
        data: {
          template_errors: {
            home_page: [{
              description: "'articles' does not exist",
              line: 10,
              column: 6,
              length: 7
            }, {
              description: 'not possible to access `user` in `user.name`',
              line: 1,
              column: 33,
              length: 10
            }],
            footer: [{
              description: "'alternative_loccales' does not exist",
              line: 6,
              column: 12,
              length: 10
            }]
          }
        }
      }
    })

    const errorStub = sinon.stub(errors, 'error').callThrough()

    try {
      await preview('theme/path', flags)
    } catch {
      const [call] = errorStub.getCalls()
      const [error] = call.args
      expect(error).to.contain('theme/path/templates/home_page.hbs:10:6')
      expect(error).to.contain('\'articles\' does not exist')
      expect(error).to.contain('theme/path/templates/home_page.hbs:1:33')
      expect(error).to.contain('not possible to access `user` in `user.name`')
      expect(error).to.contain('theme/path/templates/footer.hbs:6:12')
      expect(error).to.contain('\'alternative_loccales\' does not exist')
    }
  })
})
