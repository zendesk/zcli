import { expect, test } from '@oclif/test'
import * as path from 'path'
import * as http from 'http'
import fetch from 'node-fetch'
import { omit } from 'lodash'
import ServerCommand from '../../src/commands/apps/server'
import { AppJSONPayload } from '../../src/types'
const appJSONSnapshot = require('./mocks/snapshot_app') // eslint-disable-line @typescript-eslint/no-var-requires

describe('apps server', function () {
  const singleProductApp = path.join(__dirname, 'mocks/single_product_app')
  const multiProductApp = path.join(__dirname, 'mocks/multi_product_app')

  describe('--port 1234', () => {
    let server: http.Server
    before(async () => {
      server = await ServerCommand.run([singleProductApp, '--port', '1234'])
    })

    after(() => server.close())

    test
      .it('should serve assets on custom port', async () => {
        const appHost = 'http://localhost:1234'
        const appJSON = await fetch(`${appHost}/app.json`)
        const { installations } = await appJSON.json()
        expect(appJSON.status).to.eq(200)
        expect((await fetch(`${appHost}/${installations[0].app_id}/assets/logo-small.png`)).status).to.eq(200)
        expect((await fetch(`${appHost}/${installations[0].app_id}/assets/iframe.html`)).status).to.eq(200)
      })
  })

  describe('with multiple apps', () => {
    let server: http.Server, appHost: string, appJSON: AppJSONPayload
    before(async () => {
      server = await ServerCommand.run([singleProductApp, multiProductApp])
      appHost = 'http://localhost:4567'
      const response = await fetch(`${appHost}/app.json`)
      appJSON = await response.json()
    })

    after(() => server.close())

    test
      .it('should serve assets for single_product_app', async () => {
        const singleProductApp = appJSON.apps[0]

        expect((await fetch(`${appHost}/${singleProductApp.id}/assets/logo-small.png`)).status).to.eq(200)
        expect((await fetch(`${appHost}/${singleProductApp.id}/assets/iframe.html`)).status).to.eq(200)
        expect((await fetch(`${appHost}/${singleProductApp.id}/assets/icon_nav_bar.svg`)).status).to.eq(200)
      })

    test
      .it('should serve assets for multi_product_app', async () => {
        const multiProductApp = appJSON.apps[1]

        expect((await fetch(`${appHost}/${multiProductApp.id}/assets/support/logo-small.png`)).status).to.eq(200)
        expect((await fetch(`${appHost}/${multiProductApp.id}/assets/support/icon_nav_bar.svg`)).status).to.eq(200)
        expect((await fetch(`${appHost}/${multiProductApp.id}/assets/sell/icon_top_bar.svg`)).status).to.eq(200)
        expect((await fetch(`${appHost}/${multiProductApp.id}/assets/iframe.html`)).status).to.eq(200)
      })

    test
      .it('should serve valid app.json', async () => {
        const yyyymmdd = new Date().toISOString().substr(0, 10)
        const { apps, installations } = appJSON
        expect(apps).to.length(2)

        expect(apps[0].name).to.eq(appJSONSnapshot.apps[0].name)
        expect(apps[1].name).to.eq(appJSONSnapshot.apps[1].name)
        // We cannot assert on the id of the first app since it is dynamically generated
        expect(apps[1].id).to.eq(appJSONSnapshot.apps[1].id)

        expect(installations[0]).to.contain.keys('app_id', 'id', 'updated_at')
        expect(installations[1]).to.contain.keys('app_id', 'id', 'updated_at')

        // omit dynamic values from snapshot, as they are not easy to mock
        expect(installations[0]).to.deep.include(omit(appJSONSnapshot.installations[0], ['app_id', 'id', 'updated_at']))
        expect(installations[1]).to.deep.include(omit(appJSONSnapshot.installations[1], ['id', 'updated_at']))

        expect(installations[1].settings).to.deep.eq(appJSONSnapshot.installations[1].settings)

        expect(installations[0].updated_at).to.includes(yyyymmdd)
        expect(installations[1].updated_at).to.includes(yyyymmdd)
      })
  })
})
