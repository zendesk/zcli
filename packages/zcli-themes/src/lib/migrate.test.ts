import * as sinon from 'sinon'
import { expect } from '@oclif/test'
import * as getManifest from './getManifest'
import * as getTemplates from './getTemplates'
import * as getVariables from './getVariables'
import * as getAssets from './getAssets'
import * as rewriteManifest from './rewriteManifest'
import * as rewriteTemplates from './rewriteTemplates'
import * as rewriteAssets from './rewriteAssets'
import * as axios from 'axios'
import { request } from '@zendesk/zcli-core'
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

describe('migrate', () => {
  beforeEach(() => {
    sinon.restore()
  })

  it('calls the migrations endpoint, rewrites files, and returns the migration_report', async () => {
    const getManifestStub = sinon.stub(getManifest, 'default')
    const getTemplatesStub = sinon.stub(getTemplates, 'default')
    const getVariablesStub = sinon.stub(getVariables, 'default')
    const getAssetsStub = sinon.stub(getAssets, 'default')
    const rewriteManifestStub = sinon.stub(rewriteManifest, 'default')
    const rewriteTemplatesStub = sinon.stub(rewriteTemplates, 'default')
    const rewriteAssetsStub = sinon.stub(rewriteAssets, 'default')
    const requestStub = sinon.stub(request, 'requestAPI')

    getManifestStub.withArgs('theme/path').returns(manifest)
    getTemplatesStub.withArgs('theme/path').returns({
      home_page: '<h1>Home</h1>',
      'article_pages/product_updates': '<h1>Product updates</h1>',
      'custom_pages/faq': '<h1>FAQ</h1>'
    })

    getVariablesStub.withArgs('theme/path', manifest.settings).returns([
      { identifier: 'color', type: 'color', value: '#999' },
      {
        identifier: 'logo',
        type: 'file',
        value: 'logo.png'
      }
    ])

    getAssetsStub.withArgs('theme/path').returns([
      [
        {
          base: 'background.png',
          dir: '',
          ext: '.png',
          name: 'background',
          root: ''
        },
        'background.png'
      ]
    ])

    const migrationReport = {
      home_page: [
        { target: 'logo_url', strategy: 'inline', description: 'desc', test_plan: 'test' }
      ]
    }

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
          },
          assets: {
            'category_tree.js': Buffer.from('console.log("tree")').toString('base64')
          },
          migration_report: migrationReport
        }
      }) as axios.AxiosPromise
    )

    const result = await migrate('theme/path')

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
                'background.png': 'background.png'
              },
              variables: {
                color: '#999',
                logo: 'logo.png'
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

    expect(
      rewriteAssetsStub.calledWith('theme/path', {
        'category_tree.js': Buffer.from('console.log("tree")').toString('base64')
      })
    ).to.equal(true)

    expect(result).to.deep.equal(migrationReport)
  })

  it('propagates AxiosError on request failure', async () => {
    sinon.stub(getManifest, 'default').returns(manifest)
    sinon.stub(getTemplates, 'default').returns({})
    sinon.stub(getVariables, 'default').returns([])
    sinon.stub(getAssets, 'default').returns([])

    const axiosError = new Error('Connection refused')
    sinon.stub(request, 'requestAPI').throws(axiosError)

    try {
      await migrate('theme/path')
      throw new Error('Should have thrown')
    } catch (e) {
      expect(e).to.equal(axiosError)
    }
  })
})
