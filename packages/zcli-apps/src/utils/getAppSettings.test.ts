import { getAppSettings } from './getAppSettings'
import * as createApp from './createApp'
import { Manifest } from '../types'
import { expect, test } from '@oclif/test'

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

describe('getAppSettings', () => {
  test
    .stub(createApp, 'promptAndGetSettings', () => ({ someToken: 'ABC123' }))
    .it('should return setting from config and prompt for missing config', async () => {
      const settings = await getAppSettings(manifestOutput, { salesForceId: 222 })
      expect(settings).to.deep.equals({
        salesForceId: 222,
        someToken: 'ABC123'
      })
    })

  test
    .it('should return all settings from config', async () => {
      const settings = await getAppSettings(manifestOutput, { salesForceId: 222, someToken: 'XYZ786' })
      expect(settings).to.deep.equals({
        salesForceId: 222,
        someToken: 'XYZ786'
      })
    })
})
