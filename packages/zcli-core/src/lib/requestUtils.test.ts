import { expect, test } from '@oclif/test'
import { getBaseUrl } from './requestUtils'

describe('requestUtils', () => {
  describe('getBaseUrl', () => {
    test
      .it('should get baseUrl from subdomain and domain', async () => {
        expect(getBaseUrl('test')).to.equal('https://test.zendesk.com')
        expect(getBaseUrl('test', undefined)).to.equal('https://test.zendesk.com')
        expect(getBaseUrl('test', '')).to.equal('https://test.zendesk.com')
        expect(getBaseUrl('test', 'example.com')).to.equal('https://test.example.com')
        expect(getBaseUrl('test', 'subdomain.example.com')).to.equal('https://test.subdomain.example.com')
      })
  })
})
