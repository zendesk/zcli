import { expect, test } from '@oclif/test'
import * as sinon from 'sinon'
import { CliUx } from '@oclif/core'
import * as chalk from 'chalk'
import Auth from './auth'
import SecureStore from './secureStore'
import { Profile } from '../types'
import * as oauth from './oauth'
import * as loopback from './loopbackServer'
import * as openBrowser from './openBrowser'

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
      .stub(auth, 'getLoggedInProfile', () => ({ subdomain: 'z3ntest' }))
      .stub(auth.secureStore, 'getSecret', () => JSON.stringify({
        version: 2,
        type: 'api_token',
        authHeader: 'Basic record_token'
      }))
      .it('should return authHeader from api_token record', async () => {
        expect(await auth.getAuthorizationToken()).to.equal('Basic record_token')
      })

    test
      .stub(auth, 'getLoggedInProfile', () => ({ subdomain: 'z3ntest' }))
      .stub(auth.secureStore, 'getSecret', () => JSON.stringify({
        version: 2,
        type: 'oauth',
        accessToken: 'oauth_access',
        refreshToken: 'oauth_refresh',
        clientId: 'cid-1'
      }))
      .it('should return Bearer token from oauth record', async () => {
        expect(await auth.getAuthorizationToken()).to.equal('Bearer oauth_access')
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
    let fetchStub: sinon.SinonStub

    beforeEach(() => {
      fetchStub = sinon.stub(global, 'fetch')
    })

    afterEach(() => {
      fetchStub.restore()
    })

    test
      .do(() => {
        promptStub.onFirstCall().resolves('z3ntest')
        promptStub.onSecondCall().resolves('test@zendesk.com')
        promptStub.onThirdCall().resolves('123456')
        fetchStub.withArgs(sinon.match((req: Request) =>
          req.method === 'GET' &&
          req.url === 'https://z3ntest.zendesk.com/api/v2/account/settings.json' &&
          req.headers.get('Authorization') === 'Basic dGVzdEB6ZW5kZXNrLmNvbS90b2tlbjoxMjM0NTY='
        ))
          .resolves({
            status: 200,
            ok: true,
            text: () => Promise.resolve('')
          })
      })
      .stub(CliUx.ux, 'prompt', () => promptStub)
      .stub(auth.secureStore, 'setSecret', () => Promise.resolve())
      .stub(auth, 'setLoggedInProfile', () => Promise.resolve())
      .it('should return true on login success', async () => {
        expect(await auth.loginInteractively()).to.equal(true)
      })

    test
      .do(() => {
        promptStub.reset()
        promptStub.onFirstCall().resolves('z3ntest')
        promptStub.onSecondCall().resolves('test@zendesk.com')
        promptStub.onThirdCall().resolves('123456')
        fetchStub.withArgs(sinon.match((req: Request) =>
          req.method === 'GET' &&
          req.url === 'https://z3ntest.example.com/api/v2/account/settings.json' &&
          req.headers.get('Authorization') === 'Basic dGVzdEB6ZW5kZXNrLmNvbS90b2tlbjoxMjM0NTY='
        ))
          .resolves({
            status: 200,
            ok: true,
            text: () => Promise.resolve('')
          })
      })
      .stub(CliUx.ux, 'prompt', () => promptStub)
      .stub(auth.secureStore, 'setSecret', () => Promise.resolve())
      .stub(auth, 'setLoggedInProfile', () => Promise.resolve())
      .it('should login successfully using the passed domain and the prompted subdomain', async () => {
        expect(await auth.loginInteractively({ domain: 'example.com' } as Profile)).to.equal(true)
      })

    test
      .do(() => {
        promptStub.reset()
        promptStub.onFirstCall().resolves('test@zendesk.com')
        promptStub.onSecondCall().resolves('123456')
        fetchStub.withArgs(sinon.match((req: Request) =>
          req.method === 'GET' &&
          req.url === 'https://z3ntest.example.com/api/v2/account/settings.json' &&
          req.headers.get('Authorization') === 'Basic dGVzdEB6ZW5kZXNrLmNvbS90b2tlbjoxMjM0NTY='
        ))
          .resolves({
            status: 200,
            ok: true,
            text: () => Promise.resolve('')
          })
      })
      .stub(CliUx.ux, 'prompt', () => promptStub)
      .stub(auth.secureStore, 'setSecret', () => Promise.resolve())
      .stub(auth, 'setLoggedInProfile', () => Promise.resolve())
      .it('should login successfully using the passed subdomain and domain', async () => {
        expect(await auth.loginInteractively({ subdomain: 'z3ntest', domain: 'example.com' })).to.equal(true)
      })

    test
      .do(() => {
        promptStub.reset()
        promptStub.onFirstCall().resolves('z3ntest')
        promptStub.onSecondCall().resolves('test@zendesk.com')
        promptStub.onThirdCall().resolves('123456')
        fetchStub.withArgs(sinon.match((req: Request) =>
          req.method === 'GET' &&
          req.url === 'https://z3ntest.zendesk.com/api/v2/account/settings.json' &&
          req.headers.get('Authorization') === 'Basic dGVzdEB6ZW5kZXNrLmNvbS90b2tlbjoxMjM0NTY='
        ))
          .resolves({
            status: 403,
            ok: false,
            text: () => Promise.resolve('')
          })
      })
      .stub(CliUx.ux, 'prompt', () => promptStub)
      .it('should return false on login failure', async () => {
        expect(await auth.loginInteractively()).to.equal(false)
      })

    test
      .do(() => {
        promptStub.reset()
        promptStub.onFirstCall().resolves('z3ntest')
        promptStub.onSecondCall().resolves('test@zendesk.com')
        promptStub.onThirdCall().resolves('123456')
        fetchStub.withArgs(sinon.match((req: Request) =>
          req.method === 'GET' &&
          req.url === 'https://z3ntest.zendesk.com/api/v2/account/settings.json'
        ))
          .resolves({ status: 200, ok: true, text: () => Promise.resolve('') })
      })
      .stub(CliUx.ux, 'prompt', () => promptStub)
      .stub(auth, 'setLoggedInProfile', () => Promise.resolve())
      .it('should write an api_token credential record on successful login', async () => {
        const setSecretStub = sinon.stub(auth.secureStore!, 'setSecret').resolves()
        try {
          const ok = await auth.loginInteractively()
          expect(ok).to.equal(true)
          const stored = setSecretStub.firstCall.args[1]
          const parsed = JSON.parse(stored)
          expect(parsed).to.deep.equal({
            version: 2,
            type: 'api_token',
            authHeader: 'Basic dGVzdEB6ZW5kZXNrLmNvbS90b2tlbjoxMjM0NTY='
          })
        } finally {
          setSecretStub.restore()
        }
      })
  })

  describe('loginViaOAuth', () => {
    const auth = new Auth({ secureStore: new SecureStore() })

    afterEach(() => {
      sinon.restore()
    })

    it('runs the OAuth flow and persists an oauth credential record', async () => {
      sinon.stub(oauth, 'generatePkce').returns({ verifier: 'V', challenge: 'C', method: 'S256' })
      sinon.stub(oauth, 'generateState').returns('STATE')
      sinon.stub(oauth, 'buildAuthorizeUrl').returns('https://example/authorize')
      const serverStub = sinon.stub(loopback, 'awaitLoopbackCode').resolves('CODE-1')
      const openStub = sinon.stub(openBrowser, 'openBrowser').returns()
      const exchangeStub = sinon.stub(oauth, 'exchangeCodeForToken').resolves({
        accessToken: 'AT',
        refreshToken: 'RT',
        scope: 'read write'
      })
      const setSecretStub = sinon.stub(auth.secureStore!, 'setSecret').resolves()
      const setProfileStub = sinon.stub(auth, 'setLoggedInProfile').resolves()

      const ok = await auth.loginViaOAuth({
        subdomain: 'z3ntest',
        clientId: 'cid'
      })

      expect(ok).to.equal(true)
      expect(serverStub.calledOnce).to.equal(true)
      expect(openStub.calledWith('https://example/authorize')).to.equal(true)
      expect(exchangeStub.calledOnce).to.equal(true)

      const stored = setSecretStub.firstCall.args[1]
      const parsed = JSON.parse(stored)
      expect(parsed).to.deep.equal({
        version: 2,
        type: 'oauth',
        accessToken: 'AT',
        refreshToken: 'RT',
        clientId: 'cid'
      })

      expect(setProfileStub.calledWith('z3ntest', undefined)).to.equal(true)
    })

    it('returns false when the loopback server rejects', async () => {
      sinon.stub(oauth, 'generatePkce').returns({ verifier: 'V', challenge: 'C', method: 'S256' })
      sinon.stub(oauth, 'generateState').returns('STATE')
      sinon.stub(oauth, 'buildAuthorizeUrl').returns('https://example/authorize')
      sinon.stub(loopback, 'awaitLoopbackCode').rejects(new Error('OAuth login timed out waiting for browser callback'))
      sinon.stub(openBrowser, 'openBrowser').returns()
      const setSecretStub = sinon.stub(auth.secureStore!, 'setSecret').resolves()

      const ok = await auth.loginViaOAuth({ subdomain: 'z3ntest', clientId: 'cid' })
      expect(ok).to.equal(false)
      expect(setSecretStub.called).to.equal(false)
    })
  })

  describe('refreshOAuthToken', () => {
    const auth = new Auth({ secureStore: new SecureStore() })

    afterEach(() => {
      sinon.restore()
    })

    it('refreshes the access token, persists the new record, and returns the new bearer header', async () => {
      sinon.stub(auth, 'getLoggedInProfile').returns({ subdomain: 'z3ntest' } as any)
      sinon.stub(auth.secureStore!, 'getSecret').resolves(JSON.stringify({
        version: 2,
        type: 'oauth',
        accessToken: 'OLD_AT',
        refreshToken: 'OLD_RT',
        clientId: 'cid'
      }))
      sinon.stub(oauth, 'refreshAccessToken').resolves({
        accessToken: 'NEW_AT',
        refreshToken: 'NEW_RT'
      })
      const setSecretStub = sinon.stub(auth.secureStore!, 'setSecret').resolves()

      const newHeader = await auth.refreshOAuthToken()
      expect(newHeader).to.equal('Bearer NEW_AT')

      const stored = setSecretStub.firstCall.args[1]
      expect(JSON.parse(stored)).to.deep.equal({
        version: 2,
        type: 'oauth',
        accessToken: 'NEW_AT',
        refreshToken: 'NEW_RT',
        clientId: 'cid'
      })
    })

    it('keeps the previous refresh token if Zendesk does not return a new one', async () => {
      sinon.stub(auth, 'getLoggedInProfile').returns({ subdomain: 'z3ntest' } as any)
      sinon.stub(auth.secureStore!, 'getSecret').resolves(JSON.stringify({
        version: 2,
        type: 'oauth',
        accessToken: 'OLD_AT',
        refreshToken: 'OLD_RT',
        clientId: 'cid'
      }))
      sinon.stub(oauth, 'refreshAccessToken').resolves({ accessToken: 'NEW_AT' })
      const setSecretStub = sinon.stub(auth.secureStore!, 'setSecret').resolves()

      await auth.refreshOAuthToken()
      expect(JSON.parse(setSecretStub.firstCall.args[1]).refreshToken).to.equal('OLD_RT')
    })

    it('returns undefined if the active credential is not an oauth record', async () => {
      sinon.stub(auth, 'getLoggedInProfile').returns({ subdomain: 'z3ntest' } as any)
      sinon.stub(auth.secureStore!, 'getSecret').resolves('Basic legacy')

      const result = await auth.refreshOAuthToken()
      expect(result).to.equal(undefined)
    })

    it('returns undefined if the oauth record has no refresh token', async () => {
      sinon.stub(auth, 'getLoggedInProfile').returns({ subdomain: 'z3ntest' } as any)
      sinon.stub(auth.secureStore!, 'getSecret').resolves(JSON.stringify({
        version: 2,
        type: 'oauth',
        accessToken: 'OLD_AT',
        clientId: 'cid'
      }))

      const result = await auth.refreshOAuthToken()
      expect(result).to.equal(undefined)
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
