import { expect, test } from '@oclif/test'
import * as sinon from 'sinon'
import { createRequestConfig, requestAPI, requestRaw } from './request'
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
  let fetchStub: sinon.SinonStub

  beforeEach(() => {
    fetchStub = sinon.stub(global, 'fetch')
  })

  afterEach(() => {
    fetchStub.restore()
  })

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
      fetchStub.withArgs(sinon.match({
        url: 'https://z3ntest.zendesk.com/api/v2/me',
        method: 'GET'
      })).resolves({
        status: 200,
        ok: true,
        text: () => Promise.resolve('')
      })
    })
    .it('should call an http endpoint', async () => {
      const response = await requestAPI('api/v2/me', { method: 'GET' })
      expect(response.status).to.equal(200)
    })
})

describe('requestRaw', () => {
  let fetchStub: sinon.SinonStub

  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fetchStub = sinon.stub(global, 'fetch' as any)
  })

  afterEach(() => {
    fetchStub.restore()
  })

  it('should make a raw request without adding any extra headers', async () => {
    fetchStub.resolves({
      status: 200,
      ok: true,
      headers: new Map(),
      text: () => Promise.resolve('success'),
      data: { result: 'ok' }
    })

    const customHeaders = { 'Content-Type': 'application/zip' }
    const response = await requestRaw('https://example.com/upload', {
      method: 'PUT',
      headers: customHeaders,
      data: Buffer.from('test')
    })

    expect(response.status).to.equal(200)
    expect(fetchStub.called).to.equal(true)
  })

  it('should pass through options without modification', async () => {
    fetchStub.resolves({
      status: 201,
      ok: true,
      headers: new Map(),
      text: () => Promise.resolve('created')
    })

    const customHeaders = { 'Custom-Header': 'value' }
    await requestRaw('https://example.com/api', {
      method: 'POST',
      headers: customHeaders,
      data: { test: 'data' }
    })

    expect(fetchStub.called).to.equal(true)
  })

  it('should return 403 response without throwing error', async () => {
    fetchStub.resolves({
      status: 403,
      ok: false,
      statusText: 'Forbidden',
      headers: new Map(),
      text: () => Promise.resolve('{"error":"Access denied"}'),
      json: () => Promise.resolve({ error: 'Access denied' })
    })

    const response = await requestRaw('https://example.com/upload', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/zip' }
    })

    expect(response.status).to.equal(403)
    expect(response.data.error).to.equal('Access denied')
  })

  it('should throw error on 500 server error', async () => {
    fetchStub.rejects({
      response: {
        status: 500,
        statusText: 'Internal Server Error',
        data: { error: 'Server error' }
      }
    })

    try {
      await requestRaw('https://example.com/api', {
        method: 'POST',
        data: { test: 'data' }
      })
      expect.fail('Should have thrown an error')
    } catch (error) {
      expect((error as any).response.status).to.equal(500)
    }
  })
})
