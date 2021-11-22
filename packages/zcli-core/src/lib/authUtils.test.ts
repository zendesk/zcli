import { expect, test } from '@oclif/test'
import { parseSubdomain } from './authUtils'

describe('authUtils', () => {
  describe('parseSubdomain', () => {
    test
      .it('should extract the subdomain from a url', async () => {
        expect(parseSubdomain('https://Test1.zeNDEsk.com/')).to.equal('test1')
        expect(parseSubdomain(' hTTp://tEst2.zendesk.com/ ')).to.equal('test2')
        expect(parseSubdomain('test3.zendesk.com ')).to.equal('test3')
        expect(parseSubdomain('test4')).to.equal('test4')
      })
  })
})
