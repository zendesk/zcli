import { expect, test } from '@oclif/test'
import { getAccount, getProfileFromAccount, parseSubdomain } from './authUtils'

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

  describe('getAccount', () => {
    test.it('should get the account from subdomain and eventually domain', () => {
      expect(getAccount('test')).to.equal('test')
      expect(getAccount('test', 'example.com')).to.equal('test.example.com')
    })
  })

  describe('getProfileFromAccount', () => {
    test.it('should get the profile from account', () => {
      expect(getProfileFromAccount('test')).to.deep.equal({ subdomain: 'test' })
      expect(getProfileFromAccount('test.example.com')).to.deep.equal({ subdomain: 'test', domain: 'example.com' })
      expect(getProfileFromAccount('test.subdomain.example.com')).to.deep.equal({ subdomain: 'test', domain: 'subdomain.example.com' })
    })
  })
})
