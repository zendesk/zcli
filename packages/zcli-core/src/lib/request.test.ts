import { expect, test } from '@oclif/test'
import { requestAPI } from './request'
import Auth from './auth'

describe('requestAPI', () => {
  test
    .env({
      ZENDESK_SUBDOMAIN: 'z3ntest',
      ZENDESK_EMAIL: 'test@zendesk.com',
      ZENDESK_API_TOKEN: '123456'
    })
    .stub(Auth, 'getAuthorizationToken', () => Promise.resolve('token'))
    .nock('https://z3ntest.zendesk.com', api => {
      api
        .get('/api/v2/me')
        .reply(function () {
          expect(this.req.headers.authorization).to.equal('Basic dGVzdEB6ZW5kZXNrLmNvbS90b2tlbjoxMjM0NTY=')
          return [200]
        })
    })
    .do(async () => {
      await requestAPI('api/v2/me', { method: 'GET' })
    })
    .it('should make a request with Auth token')

  test
    .env({
      ZENDESK_SUBDOMAIN: 'z3ntest',
      ZENDESK_EMAIL: 'test@zendesk.com',
      ZENDESK_API_TOKEN: '123456'
    })
    .stub(Auth, 'getAuthorizationToken', () => Promise.resolve('token'))
    .nock('https://z3ntest.zendesk.com', api => {
      api
        .get('/api/v2/me')
        .reply(function () {
          expect(this.req.headers.authorization).to.equal('Basic dGVzdEB6ZW5kZXNrLmNvbS90b2tlbjoxMjM0NTY=')
          expect(this.req.headers.foo).to.equal('bar')
          return [200]
        })
    })
    .do(async () => {
      await requestAPI('api/v2/me', {
        headers: { foo: 'bar' },
        method: 'GET'
      })
    })
    .it('should be able to attach extra headers to request')

  test.env({
    ZENDESK_SUBDOMAIN: 'z3ntest',
    ZENDESK_DOMAIN: 'example.com',
    ZENDESK_EMAIL: 'test@zendesk.com',
    ZENDESK_API_TOKEN: '123456'
  })
    .stub(Auth, 'getAuthorizationToken', () => Promise.resolve('token'))
    .nock('https://z3ntest.example.com', api => {
      api
        .get('/api/v2/me')
        .reply(function () {
          expect(this.req.headers.authorization).to.equal('Basic dGVzdEB6ZW5kZXNrLmNvbS90b2tlbjoxMjM0NTY=')
          return [200]
        })
    }).do(async () => {
      await requestAPI('api/v2/me', {
        method: 'GET'
      })
    })
    .it('should make a request to the correct domain')

  test.env({
    ZENDESK_SUBDOMAIN: 'z3ntest',
    ZENDESK_EMAIL: 'test@zendesk.com',
    ZENDESK_API_TOKEN: '123456'
  })
    .stub(Auth, 'getAuthorizationToken', () => Promise.resolve('token'))
    .stub(Auth, 'getLoggedInProfile', () => ({ subdomain: 'z3ntest2', domain: 'example.com' }))
    .nock('https://z3ntest.zendesk.com', api => {
      api
        .get('/api/v2/me')
        .reply(function () {
          expect(this.req.headers.authorization).to.equal('Basic dGVzdEB6ZW5kZXNrLmNvbS90b2tlbjoxMjM0NTY=')
          return [200]
        })
    }).do(async () => {
      await requestAPI('api/v2/me', {
        method: 'GET'
      })
    })
    .it('should not use the domain stored in current in profile if ZENDESK_SUBDOMAIN is provided and ZENDESK_DOMAIN is not provided')
})
