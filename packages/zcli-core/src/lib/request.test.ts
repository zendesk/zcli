import { expect, test } from '@oclif/test'
import * as sinon from 'sinon'
import { createRequestConfig, requestAPI } from './request'
import * as requestUtils from './requestUtils'
import Auth from './auth'
import { Profile } from '../types'

describe('createRequestConfig', () => {
  test
    .env({
      ZENDESK_SUBDOMAIN: 'z3ntest',
      ZENDESK_OAUTH_TOKEN: 'good_token'
    })
    .stub(requestUtils, 'getSubdomain', () => 'fake')
    .stub(requestUtils, 'getDomain', () => 'fake.com')
    .it('should create a request with an OAuth token', async () => {
      const req = await createRequestConfig('api/v2/me')
      expect(req.headers.Authorization).to.equal('Bearer good_token')
    })

  test
    .env({
      ZENDESK_SUBDOMAIN: 'z3ntest',
      ZENDESK_OAUTH_TOKEN: 'good_token'
    })
    .stub(requestUtils, 'getSubdomain', () => 'fake')
    .stub(requestUtils, 'getDomain', () => 'fake.com')
    .it('should be able to attach extra headers to request', async () => {
      const req = await createRequestConfig('api/v2/me', {
        headers: { foo: 'bar' },
        method: 'GET'
      })
      expect(req.headers.Authorization).to.equal('Bearer good_token')
      expect(req.headers.foo).to.equal('bar')
    })

  test
    .env({
      ZENDESK_SUBDOMAIN: 'z3ntest',
      ZENDESK_DOMAIN: 'expected.com',
      ZENDESK_EMAIL: 'test@zendesk.com',
      ZENDESK_API_TOKEN: '123456'
    })
    .stub(requestUtils, 'getSubdomain', () => 'fake')
    .stub(requestUtils, 'getDomain', () => 'fake.com')
    .it('should be able to create a request with a Basic auth token', async () => {
      const req = await createRequestConfig('api/v2/me', {})
      expect(req.headers.Authorization).to.equal('Basic dGVzdEB6ZW5kZXNrLmNvbS90b2tlbjoxMjM0NTY=')
    })

  test
    .env({
      ZENDESK_SUBDOMAIN: 'z3ntest',
      ZENDESK_DOMAIN: 'expected.com',
      ZENDESK_EMAIL: 'test@zendesk.com',
      ZENDESK_API_TOKEN: '123456'
    })
    .stub(requestUtils, 'getSubdomain', () => 'fake')
    .stub(requestUtils, 'getDomain', () => 'fake.com')
    .it('should create a request with the correct domain', async () => {
      const req = await createRequestConfig('api/v2/me')
      expect(req.baseURL).to.equal('https://z3ntest.expected.com')
    })

  test
    .env({
      ZENDESK_SUBDOMAIN: 'z3ntest',
      ZENDESK_EMAIL: 'test@zendesk.com',
      ZENDESK_API_TOKEN: '123456'
    })
    .stub(requestUtils, 'getSubdomain', () => 'fake')
    .stub(requestUtils, 'getDomain', () => 'fake.com')
    .it('should use the default domain if ZENDESK_SUBDOMAIN is provided and ZENDESK_DOMAIN is not provided, not the profile domain', async () => {
      const req = await createRequestConfig('api/v2/me')
      expect(req.baseURL).to.equal('https://z3ntest.zendesk.com')
    })

  test
    .env({
      ZENDESK_EMAIL: 'test@zendesk.com',
      ZENDESK_API_TOKEN: '123456'
    })
    .stub(requestUtils, 'getSubdomain', () => 'ping')
    .stub(requestUtils, 'getDomain', () => 'me.com')
    .stub(Auth, 'getLoggedInProfile', () : Profile => ({ subdomain: 'ping', domain: 'me.com' }))
    .it('should be able to create auth using profile subdomain and domain', async () => {
      const req = await createRequestConfig('api/v2/me', {})
      expect(req.baseURL).to.equal('https://ping.me.com')
      expect(req.headers.Authorization).to.equal('Basic dGVzdEB6ZW5kZXNrLmNvbS90b2tlbjoxMjM0NTY=')
    })
})

describe('requestAPI', () => {
  const sandbox = sinon.createSandbox()
  const fetchStub = sandbox.stub(global, 'fetch')
  test
    .env({
      ZENDESK_SUBDOMAIN: 'z3ntest',
      ZENDESK_EMAIL: 'test@zendesk.com',
      ZENDESK_API_TOKEN: '123456',
      ZENDESK_OAUTH_TOKEN: 'good_token'
    })
    .stub(requestUtils, 'getSubdomain', () => 'fake')
    .stub(requestUtils, 'getDomain', () => 'fake.com')
    .do(() => {
      fetchStub.withArgs('https://z3ntest.zendesk.com/api/v2/me', sinon.match.any).resolves({
        status: 200,
        ok: true,
        json: () => Promise.resolve({})
      } as any)
    })
    .it('should call an http endpoint', async () => {
      const response = await requestAPI('api/v2/me', { method: 'GET' })
      expect(response.status).to.equal(200)
      sandbox.reset()
    })
  after(function () {
    sandbox.restore()
  })
})
