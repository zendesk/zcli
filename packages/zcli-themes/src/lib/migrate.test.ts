import * as sinon from 'sinon'
import { expect } from '@oclif/test'
import * as getManifest from './getManifest'
import * as getTemplates from './getTemplates'
import * as getVariables from './getVariables'
import * as getAssets from './getAssets'
import * as rewriteManifest from './rewriteManifest'
import * as rewriteTemplates from './rewriteTemplates'
import * as axios from 'axios'
import { request } from '@zendesk/zcli-core'
import * as errors from '@oclif/core/lib/errors'
import migrate from './migrate'

const manifest = {
  name: 'Copenhagen theme',
  author: 'Jane Doe',
  version: '1.0.1',
  api_version: 1,
  settings: [
    {
      variables: [
        { identifier: 'color', type: 'color', value: '#999' },
        { identifier: 'logo', type: 'file' }
      ]
    }
  ]
}

const flags = {
  bind: 'localhost',
  port: 1000,
  logs: true,
  livereload: false
}

describe('migrate', () => {
  beforeEach(() => {
    sinon.restore()
  })

  it('calls the migrations endpoint with the correct payload and rewrites files', async () => {
    const getManifestStub = sinon.stub(getManifest, 'default')
    const getTemplatesStub = sinon.stub(getTemplates, 'default')
    const getVariablesStub = sinon.stub(getVariables, 'default')
    const getAssetsStub = sinon.stub(getAssets, 'default')
    const rewriteManifestStub = sinon.stub(rewriteManifest, 'default')
    const rewriteTemplatesStub = sinon.stub(rewriteTemplates, 'default')
    const requestStub = sinon.stub(request, 'requestAPI')

    getManifestStub.withArgs('theme/path').returns(manifest)
    getTemplatesStub.withArgs('theme/path').returns({
      home_page: '<h1>Home</h1>',
      'article_pages/product_updates': '<h1>Product updates</h1>',
      'custom_pages/faq': '<h1>FAQ</h1>'
    })

    getVariablesStub.withArgs('theme/path', manifest.settings, flags).returns([
      { identifier: 'color', type: 'color', value: '#999' },
      {
        identifier: 'logo',
        type: 'file',
        value: 'http://localhost:1000/guide/settings/logo.png'
      }
    ])

    getAssetsStub.withArgs('theme/path', flags).returns([
      [
        {
          base: 'background.png',
          dir: '',
          ext: '.png',
          name: 'background',
          root: ''
        },
        'http://localhost:1000/guide/assets/background.png'
      ]
    ])

    requestStub.returns(
      Promise.resolve({
        status: 200,
        statusText: 'OK',
        data: {
          metadata: {
            api_version: 2
          },
          templates: {
            home_page: '<h1>Updated Home</h1>',
            'article_pages/product_updates': '<h1>Updated Product updates</h1>',
            'custom_pages/faq': '<h1>Updated FAQ</h1>'
          }
        }
      }) as axios.AxiosPromise
    )

    await migrate('theme/path', flags)

    expect(
      requestStub.calledWith(
        '/hc/api/internal/theming/migrations',
        sinon.match({
          method: 'POST',
          headers: {
            'X-Zendesk-Request-Originator': 'zcli themes:migrate'
          },
          data: {
            templates: {
              home_page: '<h1>Home</h1>',
              'article_pages/product_updates': '<h1>Product updates</h1>',
              'custom_pages/faq': '<h1>FAQ</h1>',
              assets: {
                'background.png':
                  'http://localhost:1000/guide/assets/background.png'
              },
              variables: {
                color: '#999',
                logo: 'http://localhost:1000/guide/settings/logo.png'
              },
              metadata: { api_version: 1 }
            }
          }
        })
      )
    ).to.equal(true)

    expect(rewriteManifestStub.calledWith('theme/path', 2)).to.equal(true)
    expect(
      rewriteTemplatesStub.calledWith('theme/path', {
        home_page: '<h1>Updated Home</h1>',
        'article_pages/product_updates': '<h1>Updated Product updates</h1>',
        'custom_pages/faq': '<h1>Updated FAQ</h1>'
      })
    ).to.equal(true)
  })

  it('throws an error when validation fails with template errors', async () => {
    sinon.stub(getManifest, 'default').returns(manifest)
    sinon.stub(getTemplates, 'default').returns({})
    sinon.stub(getVariables, 'default').returns([])
    sinon.stub(getAssets, 'default').returns([])

    sinon.stub(request, 'requestAPI').throws({
      response: {
        data: {
          template_errors: {
            home_page: [
              {
                description: "'articles' does not exist",
                line: 10,
                column: 6,
                length: 7
              }
            ],
            footer: [
              {
                description: "'alternative_locales' does not exist",
                line: 6,
                column: 12,
                length: 10
              }
            ]
          }
        }
      }
    })

    const errorStub = sinon.stub(errors, 'error').callThrough()

    try {
      await migrate('theme/path', flags)
    } catch {
      const [call] = errorStub.getCalls()
      const [error] = call.args
      expect(error).to.contain('theme/path/templates/home_page.hbs:10:6')
      expect(error).to.contain("'articles' does not exist")
      expect(error).to.contain('theme/path/templates/footer.hbs:6:12')
      expect(error).to.contain("'alternative_locales' does not exist")
    }
  })

  it('throws an error when there is a general error', async () => {
    sinon.stub(getManifest, 'default').returns(manifest)
    sinon.stub(getTemplates, 'default').returns({})
    sinon.stub(getVariables, 'default').returns([])
    sinon.stub(getAssets, 'default').returns([])

    sinon.stub(request, 'requestAPI').throws({
      response: {
        data: {
          general_error: 'Something went wrong'
        }
      }
    })

    const errorStub = sinon.stub(errors, 'error').callThrough()

    try {
      await migrate('theme/path', flags)
    } catch {
      const [call] = errorStub.getCalls()
      const [error] = call.args
      expect(error).to.equal('Something went wrong')
    }
  })

  it('throws an error when there is a response with a message', async () => {
    sinon.stub(getManifest, 'default').returns(manifest)
    sinon.stub(getTemplates, 'default').returns({})
    sinon.stub(getVariables, 'default').returns([])
    sinon.stub(getAssets, 'default').returns([])

    sinon.stub(request, 'requestAPI').throws({
      response: {
        data: {}
      },
      message: 'Network error'
    })

    const errorStub = sinon.stub(errors, 'error').callThrough()

    try {
      await migrate('theme/path', flags)
    } catch {
      const [call] = errorStub.getCalls()
      const [error] = call.args
      expect(error).to.equal('Network error')
    }
  })

  it('throws an error when there is no response', async () => {
    sinon.stub(getManifest, 'default').returns(manifest)
    sinon.stub(getTemplates, 'default').returns({})
    sinon.stub(getVariables, 'default').returns([])
    sinon.stub(getAssets, 'default').returns([])

    const axiosError = new Error('Connection refused')
    sinon.stub(request, 'requestAPI').throws(axiosError)

    const errorStub = sinon.stub(errors, 'error').callThrough()

    try {
      await migrate('theme/path', flags)
    } catch {
      const [call] = errorStub.getCalls()
      const [error] = call.args
      expect(error).to.equal(axiosError)
    }
  })
})
