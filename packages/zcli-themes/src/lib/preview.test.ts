import * as sinon from 'sinon'
import { expect } from '@oclif/test'
import * as getManifest from './getManifest'
import * as getTemplates from './getTemplates'
import * as getVariables from './getVariables'
import * as getAssets from './getAssets'
import * as axios from 'axios'
import * as chalk from 'chalk'
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

const context = {
  bind: 'localhost',
  port: 1000,
  logs: true,
  livereload: true,
  host: 'localhost',
  subdomain: 'z3n',
  username: 'admin@zendesk.com',
  password: '123456',
  origin: 'https://z3n.zendesk.com'
}

describe('preview', () => {
  beforeEach(() => {
    sinon.restore()
  })

  it('calls the local_preview endpoint with the correct payload and credentials', async () => {
    const getManifestStub = sinon.stub(getManifest, 'default')
    const getTemplatesStub = sinon.stub(getTemplates, 'default')
    const getVariablesStub = sinon.stub(getVariables, 'default')
    const getAssetsStub = sinon.stub(getAssets, 'default')
    const axiosStub = sinon.stub(axios, 'default')

    getManifestStub.withArgs('theme/path').returns(manifest)
    getTemplatesStub.withArgs('theme/path').returns({
      home_page: '<h1>Home</h1>',
      document_head: '<meta charset="utf-8">',
      'article_pages/product_updates': '<h1>Product updates</h1>',
      'custom_pages/faq': '<h1>FAQ</h1>'
    })

    getVariablesStub.withArgs('theme/path', manifest.settings, context).returns([
      { identifier: 'color', type: 'color', value: '#999' },
      { identifier: 'logo', type: 'file', value: 'http://localhost:1000/guide/settings/logo.png' }
    ])

    getAssetsStub.withArgs('theme/path', context).returns([
      [
        { base: 'background.png', dir: '', ext: '.png', name: 'background', root: '' },
        'http://localhost:1000/guide/assets/background.png'
      ]
    ])

    axiosStub.returns(Promise.resolve({
      status: 200,
      statusText: 'OK'
    }) as axios.AxiosPromise)

    expect(await preview('theme/path', context)).to.equal(true)

    expect(axiosStub.calledWith(sinon.match({
      method: 'put',
      url: 'https://z3n.zendesk.com/hc/api/internal/theming/local_preview',
      auth: {
        username: 'admin@zendesk.com',
        password: '123456'
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
            ${livereloadScript(context.host, context.port)}
          `,
          assets: { 'background.png': 'http://localhost:1000/guide/assets/background.png' },
          variables: { color: '#999', logo: 'http://localhost:1000/guide/settings/logo.png' },
          metadata: { api_version: 1 }
        }
      }
    }))).to.equal(true)
  })

  it('logs all the template errors when validation fails', async () => {
    sinon.stub(getManifest, 'default').returns(manifest)
    sinon.stub(getTemplates, 'default').returns({})
    sinon.stub(getVariables, 'default').returns([])
    sinon.stub(getAssets, 'default').returns([])

    sinon.stub(axios, 'default').returns(Promise.resolve({
      status: 400,
      data: {
        template_errors: {
          home_page: [{
            description: "'searcsh' does not exist",
            line: 10,
            column: 6,
            length: 7
          }, {
            description: 'not possible to access `help_centerr` in `help_centerr.name`',
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
    }) as axios.AxiosPromise)

    const consoleLogStub = sinon.stub(console, 'log')

    expect(await preview('theme/path', context)).to.equal(false)

    expect(consoleLogStub.calledWith(
      chalk.bold.red('Validation error'),
      'home_page L10:6: \'searcsh\' does not exist')
    ).to.equal(true)

    expect(consoleLogStub.calledWith(
      chalk.bold.red('Validation error'),
      'home_page L1:33: not possible to access `help_centerr` in `help_centerr.name`')
    ).to.equal(true)

    expect(consoleLogStub.calledWith(
      chalk.bold.red('Validation error'),
      'footer L6:12: \'alternative_loccales\' does not exist')
    ).to.equal(true)
  })
})
