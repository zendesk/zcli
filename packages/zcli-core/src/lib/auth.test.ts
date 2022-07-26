import { expect, test } from '@oclif/test'
import * as sinon from 'sinon'
import { CliUx } from '@oclif/core'
import * as chalk from 'chalk'
import Auth from './auth'
import SecureStore from './secureStore'

const mockCreateBasicAuthToken = (...args: any[]) => {
  return `Basic ${args[0]}_${args[1]}_base64`
}

describe('Auth', () => {
  describe('createBasicAuthToken', () => {
    test
      .it('should create basic auth token', async () => {
        const auth = new Auth()
        expect(
          await auth.createBasicAuthToken('test@zendesk.com', '123456')
        ).to.equal('Basic dGVzdEB6ZW5kZXNrLmNvbToxMjM0NTY=')
      })
  })

  describe('getAuthorizationToken', () => {
    const auth = new Auth({ secureStore: new SecureStore() })

    test
      .env({ ZENDESK_OAUTH_TOKEN: 'test_oauth_token' })
      .it('should return Bearer token if ZENDESK_OAUTH_TOKEN is set', async () => {
        expect(await auth.getAuthorizationToken()).to.equal('Bearer test_oauth_token')
      })

    test
      .env({
        ZENDESK_EMAIL: 'test@zendesk.com',
        ZENDESK_API_TOKEN: 'test_api_token'
      })
      .stub(auth, 'createBasicAuthToken', mockCreateBasicAuthToken)
      .it('should return basic token if ZENDESK_EMAIL and ZENDESK_API_TOKEN is set', async () => {
        expect(await auth.getAuthorizationToken()).to.equal('Basic test@zendesk.com/token_test_api_token_base64')
      })

    test
      .env({
        ZENDESK_EMAIL: 'test@zendesk.com',
        ZENDESK_PASSWORD: '123456'
      })
      .stub(auth, 'createBasicAuthToken', mockCreateBasicAuthToken)
      .it('should return basic token if ZENDESK_EMAIL and ZENDESK_PASSWORD is set', async () => {
        expect(await auth.getAuthorizationToken()).to.equal('Basic test@zendesk.com_123456_base64')
      })

    test
      .stub(auth, 'getLoggedInProfile', () => ({ subdomain: 'z3ntest' }))
      .stub(auth.secureStore, 'getPassword', () => 'Basic test_token')
      .it('should return token stored in secure store if no env vars are set', async () => {
        expect(await auth.getAuthorizationToken()).to.equal('Basic test_token')
      })

    test
      .env({
        ZENDESK_OAUTH_TOKEN: 'test_oauth_token',
        ZENDESK_EMAIL: 'test@zendesk.com',
        ZENDESK_API_TOKEN: 'test_api_token',
        ZENDESK_PASSWORD: '123456'
      })
      .it('should give precedence to ZENDESK_OAUTH_TOKEN', async () => {
        expect(await auth.getAuthorizationToken()).to.equal('Bearer test_oauth_token')
      })

    test
      .env({
        ZENDESK_EMAIL: 'test@zendesk.com',
        ZENDESK_API_TOKEN: 'test_api_token',
        ZENDESK_PASSWORD: '123456'
      })
      .stub(auth, 'createBasicAuthToken', mockCreateBasicAuthToken)
      .it('should give precedence to ZENDESK_EMAIL and ZENDESK_API_TOKEN when ZENDESK_OAUTH_TOKEN is not defined', async () => {
        expect(await auth.getAuthorizationToken()).to.equal('Basic test@zendesk.com/token_test_api_token_base64')
      })
  })

  describe('loginInteractively', () => {
    const auth = new Auth({ secureStore: new SecureStore() })
    const promptStub = sinon.stub()

    test
      .do(() => {
        promptStub.onFirstCall().resolves('z3ntest')
        promptStub.onSecondCall().resolves('test@zendesk.com')
        promptStub.onThirdCall().resolves('123456')
      })
      .stub(CliUx.ux, 'prompt', () => promptStub)
      .stub(auth.secureStore, 'setPassword', () => Promise.resolve())
      .stub(auth, 'setLoggedInProfile', () => Promise.resolve())
      .stub(auth, 'createBasicAuthToken', mockCreateBasicAuthToken)
      .nock('https://z3ntest.zendesk.com', api => {
        api
          .get('/api/v2/account/settings.json')
          .reply(function () {
            expect(this.req.headers.authorization).to.equal('Basic test@zendesk.com_123456_base64')
            return [200]
          })
      })
      .it('should return true on login success', async () => {
        expect(await auth.loginInteractively()).to.equal(true)
      })

    test
      .do(() => {
        promptStub.reset()
        promptStub.onFirstCall().resolves('z3ntest')
        promptStub.onSecondCall().resolves('test@zendesk.com')
        promptStub.onThirdCall().resolves('123456')
      })
      .stub(CliUx.ux, 'prompt', () => promptStub)
      .nock('https://z3ntest.zendesk.com', api => api
        .get('/api/v2/account/settings.json')
        .reply(403))
      .it('should return false on login failure', async () => {
        expect(await auth.loginInteractively()).to.equal(false)
      })
  })

  describe('logout', () => {
    const auth = new Auth({ secureStore: new SecureStore() })

    test
      .stub(auth, 'getLoggedInProfile', () => ({ subdomain: 'z3ntest' }))
      .stub(auth.secureStore, 'deletePassword', () => Promise.resolve(true))
      .stub(auth.config, 'removeConfig', () => Promise.resolve())
      .it('should return true on logout success', async () => {
        expect(await auth.logout()).to.equal(true)
      })

    test
      .stub(auth, 'getLoggedInProfile', () => ({}))
      .do(async () => {
        await auth.logout()
      })
      .catch(chalk.red('Failed to log out: no active profile found.'))
      .it('should throw error if no logged in profile found')

    test
      .stub(auth, 'getLoggedInProfile', () => ({ subdomain: 'z3ntest' }))
      .stub(auth.secureStore, 'deletePassword', () => Promise.resolve(false))
      .stub(auth.config, 'removeConfig', () => Promise.resolve())
      .do(async () => {
        await auth.logout()
      })
      .catch(chalk.red('Failed to log out: Account, Service not found.'))
      .it('should throw error if account or service found in secure store')
  })
})
