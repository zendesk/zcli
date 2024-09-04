import { expect, test } from '@oclif/test'
import * as sinon from 'sinon'
import { CliUx } from '@oclif/core'
import * as chalk from 'chalk'
import Auth from './auth'
import SecureStore from './secureStore'
import { Profile } from '../types'

describe('Auth', () => {
  describe('createBasicAuthToken', () => {
    test
      .it('should create basic auth token', async () => {
        const auth = new Auth()
        expect(
          await auth.createBasicAuthToken('test@zendesk.com', '123456')
        ).to.equal('Basic dGVzdEB6ZW5kZXNrLmNvbS90b2tlbjoxMjM0NTY=')
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
      .it('should return basic token if ZENDESK_EMAIL and ZENDESK_API_TOKEN is set', async () => {
        expect(await auth.getAuthorizationToken()).to.equal('Basic dGVzdEB6ZW5kZXNrLmNvbS90b2tlbjp0ZXN0X2FwaV90b2tlbg==')
      })

    test
      .stub(auth, 'getLoggedInProfile', () => ({ subdomain: 'z3ntest' }))
      .stub(auth.secureStore, 'getSecret', () => 'Basic test_token')
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
      .it('should give precedence to ZENDESK_EMAIL and ZENDESK_API_TOKEN when ZENDESK_OAUTH_TOKEN is not defined', async () => {
        expect(await auth.getAuthorizationToken()).to.equal('Basic dGVzdEB6ZW5kZXNrLmNvbS90b2tlbjp0ZXN0X2FwaV90b2tlbg==')
      })

    test
      .env({
        ZENDESK_EMAIL: 'test@zendesk.com',
        ZENDESK_PASSWORD: '123456'
      })
      .do(async () => {
        await auth.getAuthorizationToken()
      })
      .catch(chalk.red('Basic authentication of type \'password\' is not supported.'))
      .it('should throw an error if only ZENDESK_EMAIL and ZENDESK_PASSWORD are set - basic auth with password not supported')
  })

  describe('loginInteractively', () => {
    const auth = new Auth({ secureStore: new SecureStore() })
    const promptStub = sinon.stub()
    const sandbox = sinon.createSandbox()
    let fetchStub: any

    before(() => {
      fetchStub = sandbox.stub(global, 'fetch')
    })
    after(() => {
      sandbox.restore()
    })

    test
      .do(() => {
        promptStub.onFirstCall().resolves('z3ntest')
        promptStub.onSecondCall().resolves('test@zendesk.com')
        promptStub.onThirdCall().resolves('123456')
      })
      .stub(CliUx.ux, 'prompt', () => promptStub)
      .stub(auth.secureStore, 'setSecret', () => Promise.resolve())
      .stub(auth, 'setLoggedInProfile', () => Promise.resolve())
      .do(() => {
        fetchStub.withArgs('https://z3ntest.zendesk.com/api/v2/account/settings.json',
          sinon.match(function (params) {
            if (params.headers.Authorization === 'Basic dGVzdEB6ZW5kZXNrLmNvbS90b2tlbjoxMjM0NTY=') {
              return true
            }
            return false
          })).resolves({
            status: 200,
            json: () => Promise.resolve({})
          } as any)
      })
      .it('should return true on login success', async () => {
        expect(await auth.loginInteractively()).to.equal(true)
        sandbox.reset()
      })

    test
      .do(() => {
        promptStub.reset()
        promptStub.onFirstCall().resolves('z3ntest')
        promptStub.onSecondCall().resolves('test@zendesk.com')
        promptStub.onThirdCall().resolves('123456')
      })
      .stub(CliUx.ux, 'prompt', () => promptStub)
      .stub(auth.secureStore, 'setSecret', () => Promise.resolve())
      .stub(auth, 'setLoggedInProfile', () => Promise.resolve())
      .do(() => {
        fetchStub.withArgs('https://z3ntest.example.com/api/v2/account/settings.json',
          sinon.match(function (params) {
            if (params.headers.Authorization === 'Basic dGVzdEB6ZW5kZXNrLmNvbS90b2tlbjoxMjM0NTY=') {
              return true
            }
            return false
          })).resolves({
            status: 200,
            json: () => Promise.resolve({})
          } as any)
      })
      .it('should login successfully using the passed domain and the prompted subdomain', async () => {
        expect(await auth.loginInteractively({ domain: 'example.com' } as Profile)).to.equal(true)
        sandbox.reset()
      })

    test
      .do(() => {
        promptStub.reset()
        promptStub.onFirstCall().resolves('test@zendesk.com')
        promptStub.onSecondCall().resolves('123456')
      })
      .stub(CliUx.ux, 'prompt', () => promptStub)
      .stub(auth.secureStore, 'setSecret', () => Promise.resolve())
      .stub(auth, 'setLoggedInProfile', () => Promise.resolve())
      .do(() => {
        fetchStub.withArgs('https://z3ntest.example.com/api/v2/account/settings.json',
          sinon.match(function (params) {
            if (params.headers.Authorization === 'Basic dGVzdEB6ZW5kZXNrLmNvbS90b2tlbjoxMjM0NTY=') {
              return true
            }
            return false
          })).resolves({
            status: 200,
            json: () => Promise.resolve({})
          } as any)
      })
      .it('should login successfully using the passed subdomain and domain', async () => {
        expect(await auth.loginInteractively({ subdomain: 'z3ntest', domain: 'example.com' })).to.equal(true)
        sandbox.reset()
      })

    test
      .do(() => {
        promptStub.reset()
        promptStub.onFirstCall().resolves('z3ntest')
        promptStub.onSecondCall().resolves('test@zendesk.com')
        promptStub.onThirdCall().resolves('123456')
      })
      .stub(CliUx.ux, 'prompt', () => promptStub)
      .do(() => {
        fetchStub.withArgs('https://z3ntest.zendesk.com/api/v2/account/settings.json', sinon.match.any).resolves({
          status: 403,
          json: () => Promise.resolve({})
        } as any)
      })
      .it('should return false on login failure', async () => {
        expect(await auth.loginInteractively()).to.equal(false)
        sandbox.reset()
      })
  })

  describe('logout', () => {
    const auth = new Auth({ secureStore: new SecureStore() })

    test
      .stub(auth, 'getLoggedInProfile', () => ({ subdomain: 'z3ntest' }))
      .stub(auth.secureStore, 'deleteSecret', () => Promise.resolve(true))
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
      .stub(auth.secureStore, 'deleteSecret', () => Promise.resolve(false))
      .stub(auth.config, 'removeConfig', () => Promise.resolve())
      .do(async () => {
        await auth.logout()
      })
      .catch(chalk.red('Failed to log out: Account, Service not found.'))
      .it('should throw error if account or service found in secure store')
  })
})
