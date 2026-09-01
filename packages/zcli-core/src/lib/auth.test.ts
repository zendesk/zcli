import { expect, test } from '@oclif/test'
import * as sinon from 'sinon'
import * as chalk from 'chalk'
import Auth from './auth'
import SecureStore from './secureStore'
import * as oauth from './oauth'

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
      .stub(auth.secureStore, 'getSecret', () => oauth.encodeOAuthSecret('at', 'rt', 3600))
      .it('should return a Bearer token for a non-expired OAuth secret without refreshing', async () => {
        const refreshSpy = sinon.stub(oauth, 'refreshAccessToken')
        try {
          expect(await auth.getAuthorizationToken()).to.equal('Bearer at')
          expect(refreshSpy.called).to.equal(false)
        } finally {
          refreshSpy.restore()
        }
      })

    test
      .stub(auth, 'getLoggedInProfile', () => ({ subdomain: 'z3ntest' }))
      .stub(auth.secureStore, 'getSecret', () => oauth.encodeOAuthSecret('old-at', 'old-rt', -3600))
      .it('should refresh and store a new token when the stored OAuth secret is expired', async () => {
        const refreshStub = sinon.stub(oauth, 'refreshAccessToken').resolves({
          access_token: 'new-at',
          refresh_token: 'new-rt',
          expires_in: 3600,
          token_type: 'bearer',
          scope: 'read write'
        })
        const setSecretStub = sinon.stub(auth.secureStore as SecureStore, 'setSecret').resolves()
        try {
          expect(await auth.getAuthorizationToken()).to.equal('Bearer new-at')
          expect(setSecretStub.calledWith('z3ntest')).to.equal(true)
        } finally {
          refreshStub.restore()
          setSecretStub.restore()
        }
      })

    test
      .stub(auth, 'getLoggedInProfile', () => ({ subdomain: 'z3ntest' }))
      .stub(auth.secureStore, 'getSecret', () => oauth.encodeOAuthSecret('old-at', 'old-rt', -3600))
      .it('should clear the stored secret and throw when refresh fails', async () => {
        const refreshStub = sinon.stub(oauth, 'refreshAccessToken').rejects(new Error('refresh failed'))
        const deleteSecretStub = sinon.stub(auth.secureStore as SecureStore, 'deleteSecret').resolves(true)
        try {
          let thrown: Error | undefined
          try {
            await auth.getAuthorizationToken()
          } catch (error) {
            thrown = error as Error
          }
          expect(thrown?.message).to.equal(chalk.red('Your session has expired and could not be refreshed. Please run `zcli login` again.'))
          expect(deleteSecretStub.calledWith('z3ntest')).to.equal(true)
        } finally {
          refreshStub.restore()
          deleteSecretStub.restore()
        }
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

  describe('loginWithOAuth', () => {
    const auth = new Auth({ secureStore: new SecureStore() })
    let stubs: sinon.SinonStub[] = []

    afterEach(() => {
      stubs.forEach(s => s.restore())
      stubs = []
    })

    it('stores the exchanged tokens and sets the active profile on success', async () => {
      stubs.push(sinon.stub(oauth, 'startCallbackServer').resolves({
        port: 8976,
        waitForCallback: () => Promise.resolve({ code: 'the-code', state: 'the-state' }),
        close: sinon.stub()
      }))
      stubs.push(sinon.stub(oauth, 'exchangeCodeForToken').resolves({
        access_token: 'at',
        refresh_token: 'rt',
        expires_in: 3600,
        token_type: 'bearer',
        scope: 'read write'
      }))
      const setSecretStub = sinon.stub(auth.secureStore as SecureStore, 'setSecret').resolves()
      const setLoggedInProfileStub = sinon.stub(auth, 'setLoggedInProfile').resolves()
      stubs.push(setSecretStub, setLoggedInProfileStub)

      const success = await auth.loginWithOAuth({ subdomain: 'z3ntest' })

      expect(success).to.equal(true)
      expect(setSecretStub.calledWith('z3ntest')).to.equal(true)
      expect(setLoggedInProfileStub.calledWith('z3ntest', undefined)).to.equal(true)
    })

    it('propagates the ports-in-use error without opening a browser', async () => {
      const portsInUseError = new Error(oauth.ERR_PORTS_IN_USE)
      stubs.push(sinon.stub(oauth, 'startCallbackServer').rejects(portsInUseError))
      const exchangeStub = sinon.stub(oauth, 'exchangeCodeForToken')
      stubs.push(exchangeStub)

      let thrown: Error | undefined
      try {
        await auth.loginWithOAuth({ subdomain: 'z3ntest' })
      } catch (error) {
        thrown = error as Error
      }

      expect(thrown?.message).to.equal(oauth.ERR_PORTS_IN_USE)
      expect(exchangeStub.called).to.equal(false)
    })

    it('propagates a callback error without storing anything', async () => {
      stubs.push(sinon.stub(oauth, 'startCallbackServer').resolves({
        port: 8976,
        waitForCallback: () => Promise.reject(new Error('Login failed: access_denied')),
        close: sinon.stub()
      }))
      const setSecretStub = sinon.stub(auth.secureStore as SecureStore, 'setSecret').resolves()
      stubs.push(setSecretStub)

      let thrown: Error | undefined
      try {
        await auth.loginWithOAuth({ subdomain: 'z3ntest' })
      } catch (error) {
        thrown = error as Error
      }

      expect(thrown?.message).to.equal('Login failed: access_denied')
      expect(setSecretStub.called).to.equal(false)
    })
  })

  describe('forceRefreshAuthorizationToken', () => {
    const auth = new Auth({ secureStore: new SecureStore() })

    test
      .stub(auth, 'getLoggedInProfile', () => undefined)
      .it('should return undefined when no profile is logged in', async () => {
        expect(await auth.forceRefreshAuthorizationToken()).to.equal(undefined)
      })

    test
      .stub(auth, 'getLoggedInProfile', () => ({ subdomain: 'z3ntest' }))
      .stub(auth.secureStore, 'getSecret', () => 'Basic legacy_token')
      .it('should return undefined for a legacy (non-OAuth) profile', async () => {
        expect(await auth.forceRefreshAuthorizationToken()).to.equal(undefined)
      })

    test
      .stub(auth, 'getLoggedInProfile', () => ({ subdomain: 'z3ntest' }))
      .stub(auth.secureStore, 'getSecret', () => oauth.encodeOAuthSecret('old-at', 'old-rt', 3600))
      .it('should force a refresh and return the new Bearer token', async () => {
        const refreshStub = sinon.stub(oauth, 'refreshAccessToken').resolves({
          access_token: 'forced-new-at',
          refresh_token: 'forced-new-rt',
          expires_in: 3600,
          token_type: 'bearer',
          scope: 'read write'
        })
        const setSecretStub = sinon.stub(auth.secureStore as SecureStore, 'setSecret').resolves()
        try {
          expect(await auth.forceRefreshAuthorizationToken()).to.equal('Bearer forced-new-at')
          expect(setSecretStub.calledWith('z3ntest')).to.equal(true)
        } finally {
          refreshStub.restore()
          setSecretStub.restore()
        }
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
