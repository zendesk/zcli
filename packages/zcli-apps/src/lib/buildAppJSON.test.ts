import * as appConfig from '../utils/appConfig'
import { expect, test } from '@oclif/test'
import * as fs from 'fs'
import * as sinon from 'sinon'
import * as uuid from '../utils/uuid'
import * as buildAppJSON from './buildAppJSON'
import * as appPath from '../lib/appPath'
import * as manifest from '../utils/manifest'
import { Manifest } from './../types'
import * as chalk from 'chalk'
import * as path from 'path'

const manifestOutput: Manifest = {
  name: 'app 1',
  author: {
    name: 'name',
    email: 'test@email.com'
  },
  defaultLocale: 'en',
  location: {
    sell: {
      top_bar: 'assets/iframe.html'
    },
    support: {
      ticket_editor: 'assets/iframe.html',
      nav_bar: 'assets/iframe.html'
    }
  },
  singleInstall: true,
  signedUrls: false,
  frameworkVersion: '2.0',
  parameters: [{
    name: 'someToken',
    type: 'text',
    secure: true
  }, {
    name: 'salesForceId',
    type: 'number',
    secure: false
  }]
}

const manifestOutputNoParams: Manifest = {
  name: 'app 1',
  author: {
    name: 'name',
    email: 'test@email.com'
  },
  defaultLocale: 'en',
  location: {
    sell: {
      top_bar: 'assets/iframe.html'
    },
    support: {
      ticket_editor: 'assets/iframe.html',
      nav_bar: 'assets/iframe.html'
    }
  },
  singleInstall: true,
  signedUrls: false,
  frameworkVersion: '2.0'
}

const multiProductLocation = {
  sell: {
    top_bar: 'assets/iframe.html'
  },
  support: {
    ticket_editor: 'assets/iframe.html',
    nav_bar: 'assets/iframe.html'
  }
}
const multiProductLocationIcons = {
  sell: {
    top_bar: {
      svg: 'sell/icon_top_bar.svg'
    }
  },
  support: {
    nav_bar: {
      svg: 'support/icon_nav_bar.svg'
    },
    ticket_editor: {
      svg: 'support/icon_ticket_editor.svg'
    }
  }
}

const singleProductLocationIcons = {
  support: {
    nav_bar: {
      svg: 'icon_nav_bar.svg'
    },
    ticket_editor: {
      svg: 'icon_ticket_editor.svg'
    }
  }
}

const singleProductLocation = {
  support: {
    ticket_editor: 'assets/iframe.html',
    nav_bar: 'assets/iframe.html'
  }
}

const multiProductAppPath = path.join(process.cwd(), 'packages', '/zcli-apps/tests/functional/mocks/multi_product_app')
const singleProductAppPath = path.join(process.cwd(), 'packages', '/zcli-apps/tests/functional/mocks/single_product_app')

describe('warnMissingParamsValues', () => {
  const configParams = {
    someToken: 'fksjdhfb231435',
    salesForceId: 123
  }
  const manifestParams = [{
    name: 'api_token',
    type: 'text',
    secure: true
  }]
  const appId = '234'

  it('should throw an exception if a token is not present in the config file', () => {
    expect(() => {
      buildAppJSON.warnMissingParamsValues(configParams, manifestParams, appId)
    }).to.throw(chalk.red(`Your zcli configuration file is missing a setting: api_token, for app: ${appId}`))
  })
})

describe('getIconsByProduct', () => {
  const product = 'support'
  const locations = {
    nav_bar: 'assets/iframe.html',
    top_bar: 'assets/iframe.html'
  }
  const manifestLocations = {
    support: {
      nav_bar: 'assets/iframe.html',
      top_bar: 'assets/iframe.html'
    }
  }

  describe('when svg exists at path', () => {
    test
      .stub(fs, 'existsSync', () => true)
      .it('should return an object with icons per location', () => {
        expect(buildAppJSON.getIconsByProduct(product, locations, manifestLocations, './appPath1')).to.deep.equal({
          nav_bar: {
            svg: 'icon_nav_bar.svg'
          },
          top_bar: {
            svg: 'icon_top_bar.svg'
          }
        })
      })
  })

  describe('when svg does not exist at path', () => {
    test
      .stub(fs, 'existsSync', () => false)
      .it('should return an empty object', () => {
        expect(buildAppJSON.getIconsByProduct(product, locations, manifestLocations, './appPath1')).to.deep.equal({})
      })
  })
})

describe('getAppAssetsURLPrefix', () => {
  const port = 1234
  const appID = '1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed'
  const url = `http://localhost:${port}/${appID}/assets/`
  it('should return a URL with correct port and appID', () => {
    expect(buildAppJSON.getAppAssetsURLPrefix(port, appID)).to.eq(url)
  })
})

describe('getAppPayloadFromManifest', () => {
  it('generate app payload from manifest', () => {
    const appPayload = buildAppJSON.getAppPayloadFromManifest(manifestOutput, 4567, '123', multiProductLocationIcons)
    expect(appPayload).to.deep.equal({
      name: 'app 1',
      id: '123',
      default_locale: 'en',
      location: multiProductLocation,
      location_icons: multiProductLocationIcons,
      asset_url_prefix: 'http://localhost:4567/123/assets/',
      version: undefined,
      single_install: true,
      signed_urls: false,
      framework_version: '2.0'
    })
  })
})

describe('getUnsetParameters', () => {
  const parametersFromConfig = {
    someToken: 'fksjdhfb231435',
    salesForceId: 123
  }
  const manifestParameters = [{
    name: 'api_token',
    type: 'text',
    secure: true
  }]

  it('should return unset parameters', () => {
    expect(buildAppJSON.getUnsetParameters(parametersFromConfig, manifestParameters)).to.deep.equal(['api_token'])
  })
})

describe('getLocationIcons', () => {
  it('should return expected locationIcons object for multi product app', () => {
    expect(buildAppJSON.getLocationIcons(multiProductAppPath, manifestOutput.location)).to.deep.equal(multiProductLocationIcons)
  })

  it('should return expected locationIcons object for single product app', () => {
    expect(buildAppJSON.getLocationIcons(singleProductAppPath, singleProductLocation)).to.deep.equal(singleProductLocationIcons)
  })
})

describe('getInstallation', () => {
  before(function () {
    this.clock = sinon.useFakeTimers(new Date('2020-01-01'))
  })

  after(function () {
    this.clock.restore()
  })

  test
    .it('should return installation object', () => {
      const app = {
        name: 'app 1',
        id: '123',
        default_locale: 'en',
        location: singleProductLocation,
        asset_url_prefix: '/app/assets',
        location_icons: singleProductLocationIcons,
        framework_version: '2.0'
      }
      const parameters = {
        someToken: 'fksjdhfb231435',
        salesForceId: 123
      }
      expect(buildAppJSON.getInstallation('123', app, { plan: 'silver' }, parameters))
        .to.deep.contain({
          app_id: '123',
          name: 'app 1',
          collapsible: true,
          enabled: true,
          plan: 'silver',
          requirements: {},
          settings: {
            salesForceId: 123,
            someToken: 'fksjdhfb231435',
            title: 'app 1'
          },
          updated_at: '2020-01-01T00:00:00.000Z'
        })
    })
})

describe('buildAppJSON', () => {
  before(function () {
    this.clock = sinon.useFakeTimers(new Date('2020-01-01'))
  })

  after(function () {
    this.clock.restore()
  })

  const mockId = '1'

  test
    .stub(appPath, 'validateAppPath', () => {}) // eslint-disable-line @typescript-eslint/no-empty-function
    .stub(manifest, 'getManifestFile', () => manifestOutput)
    .stub(appConfig, 'getAllConfigs', () => ({
      app_id: '234',
      plan: 'silver',
      parameters: {
        someToken: 'fksjdhfb231435',
        salesForceId: 123
      }
    })
    )
    .stub(uuid, 'uuidV4', () => mockId)
    .stub(buildAppJSON, 'getLocationIcons', () => { return multiProductLocationIcons })
    .it('should return a JSON object with zcli.apps.config.json file contents', () => {
      const appJSON = buildAppJSON.buildAppJSON(['./app1'], 1234, 'zcli.apps.config.json')
      expect(appJSON).to.deep.include({
        apps: [
          {
            asset_url_prefix: 'http://localhost:1234/234/assets/',
            default_locale: 'en',
            framework_version: '2.0',
            location: multiProductLocation,
            location_icons: multiProductLocationIcons,
            name: 'app 1',
            id: '234',
            signed_urls: false,
            single_install: true,
            version: undefined
          }
        ],
        installations: [
          {
            app_id: '234',
            collapsible: true,
            enabled: true,
            id: mockId,
            name: 'app 1',
            plan: 'silver',
            requirements: {},
            settings: {
              salesForceId: 123,
              someToken: 'fksjdhfb231435',
              title: 'app 1'
            },
            updated_at: '2020-01-01T00:00:00.000Z'
          }
        ]
      })
    })

  test
    .stub(appPath, 'validateAppPath', () => {}) // eslint-disable-line @typescript-eslint/no-empty-function
    .stub(manifest, 'getManifestFile', () => manifestOutput)
    .stub(appConfig, 'getAllConfigs', () => ({
      app_id: '234',
      plan: 'silver',
      parameters: {
        someToken: 'fksjdhfb231435'
      }
    })
    )
    .it('should throw an error if a setting is missing', () => {
      expect(() => {
        buildAppJSON.buildAppJSON(['./app1'], 1234, 'zcli.apps.config.json')
      }).to.throw(chalk.red('Your zcli configuration file is missing a setting: salesForceId, for app: 234'))
    })

  describe('for config with no params', () => {
    test
      .stub(appPath, 'validateAppPath', () => {}) // eslint-disable-line @typescript-eslint/no-empty-function
      .stub(manifest, 'getManifestFile', () => manifestOutput)
      .stub(appConfig, 'getAllConfigs', () => ({
        app_id: '234',
        plan: 'silver'
      })
      )
      .it('should throw an error if a setting is missing', () => {
        expect(() => {
          buildAppJSON.buildAppJSON(['./app1'], 1234, 'zcli.apps.config.json')
        }).to.throw(chalk.red('Your zcli configuration file is missing a setting: someToken, for app: 234'))
      })
  })

  describe('for config with no app_id', () => {
    test
      .stub(appPath, 'validateAppPath', () => {}) // eslint-disable-line @typescript-eslint/no-empty-function
      .stub(manifest, 'getManifestFile', () => manifestOutput)
      .stub(appConfig, 'getAllConfigs', () => ({
        plan: 'silver'
      })
      )
      .stub(uuid, 'uuidV4', () => mockId)
      .it('should throw an error if a setting is missing', () => {
        expect(() => {
          buildAppJSON.buildAppJSON(['./app1'], 1234, 'zcli.apps.config.json')
        }).to.throw(chalk.red(`Your zcli configuration file is missing a setting: someToken, for app: ${mockId}`))
      })
  })

  describe('with no zcli config file', () => {
    test
      .stub(appPath, 'validateAppPath', () => {}) // eslint-disable-line @typescript-eslint/no-empty-function
      .stub(manifest, 'getManifestFile', () => manifestOutput)
      .stub(uuid, 'uuidV4', () => mockId)
      .it('should throw an error if a setting is missing', () => {
        expect(() => {
          buildAppJSON.buildAppJSON(['./app1'], 1234, 'zcli.apps.config.json')
        }).to.throw(chalk.red(`Your zcli configuration file is missing a setting: someToken, for app: ${mockId}`))
      })
  })

  describe('with no params attribute on manifest file', () => {
    test
      .stub(appPath, 'validateAppPath', () => {}) // eslint-disable-line @typescript-eslint/no-empty-function
      .stub(manifest, 'getManifestFile', () => manifestOutputNoParams)
      .stub(appConfig, 'getAllConfigs', () => ({
        app_id: '234',
        plan: 'silver',
        parameters: {
          someToken: 'fksjdhfb231435',
          salesForceId: 123
        }
      })
      )
      .stub(uuid, 'uuidV4', () => mockId)
      .stub(buildAppJSON, 'getLocationIcons', () => { return multiProductLocationIcons })
      .it('should return a JSON object with zcli.apps.config.json file contents', () => {
        const appJSON = buildAppJSON.buildAppJSON(['./app1'], 1234, 'zcli.apps.config.json')
        expect(appJSON).to.deep.include({
          apps: [
            {
              asset_url_prefix: 'http://localhost:1234/234/assets/',
              default_locale: 'en',
              framework_version: '2.0',
              location: multiProductLocation,
              location_icons: multiProductLocationIcons,
              name: 'app 1',
              id: '234',
              signed_urls: false,
              single_install: true,
              version: undefined
            }
          ],
          installations: [
            {
              app_id: '234',
              collapsible: true,
              enabled: true,
              id: mockId,
              name: 'app 1',
              plan: 'silver',
              requirements: {},
              settings: {
                title: 'app 1'
              },
              updated_at: '2020-01-01T00:00:00.000Z'
            }
          ]
        })
      })
  })
})
