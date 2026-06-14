import { CLIError } from '@oclif/core/lib/errors'
import * as chalk from 'chalk'
import { CliUx } from '@oclif/core'
import Config from './config'
import axios from 'axios'
import SecureStore from './secureStore'
import { Profile } from '../types'
import { getAccount, parseSubdomain } from './authUtils'
import { getBaseUrl } from './requestUtils'
import { SecretType } from './secretType'
import { parseCredential, serializeCredential } from './credentialRecord'
import * as oauth from './oauth'
import * as loopback from './loopbackServer'
import * as openBrowser from './openBrowser'

export const OAUTH_LOOPBACK_PORT = 8976
export const OAUTH_LOOPBACK_PATH = '/callback'
export const OAUTH_REDIRECT_URI = `http://localhost:${OAUTH_LOOPBACK_PORT}${OAUTH_LOOPBACK_PATH}`
export const OAUTH_DEFAULT_SCOPE = 'read write'

export interface AuthOptions {
  secureStore: SecureStore;
}
export default class Auth {
  secureStore?: SecureStore
  config: Config

  constructor (options?: AuthOptions) {
    this.secureStore = options?.secureStore
    this.config = new Config()
  }

  // 1. If env vars are set, prepare token using them
  // 2. If no env vars, check if current profile is set
  async getAuthorizationToken () {
    const { ZENDESK_EMAIL, ZENDESK_PASSWORD, ZENDESK_API_TOKEN, ZENDESK_OAUTH_TOKEN } = process.env

    if (ZENDESK_OAUTH_TOKEN) {
      return `Bearer ${ZENDESK_OAUTH_TOKEN}`
    } else if (ZENDESK_EMAIL && ZENDESK_API_TOKEN) {
      return this.createBasicAuthToken(`${ZENDESK_EMAIL}`, ZENDESK_API_TOKEN)
    } else if (ZENDESK_EMAIL && ZENDESK_PASSWORD) {
      return this.createBasicAuthToken(ZENDESK_EMAIL, ZENDESK_PASSWORD, SecretType.PASSWORD)
    } else {
      const profile = await this.getLoggedInProfile()
      if (profile && this.secureStore) {
        const stored = await this.secureStore.getSecret(getAccount(profile.subdomain, profile.domain))
        const record = parseCredential(stored ?? null)
        if (!record) return undefined
        if (record.type === 'oauth') {
          return `Bearer ${record.accessToken}`
        }
        return record.authHeader
      }

      return undefined
    }
  }

  createBasicAuthToken (user: string, secret: string, secretType: SecretType = SecretType.TOKEN) {
    const basicBase64 = (str: string) => `Basic ${Buffer.from(str).toString('base64')}`
    if (secretType === SecretType.TOKEN) {
      return basicBase64(`${user}/token:${secret}`)
    }
    throw new CLIError(chalk.red(`Basic authentication of type '${secretType}' is not supported.`))
  }

  getLoggedInProfile () {
    return this.config.getConfig('activeProfile') as unknown as Profile
  }

  setLoggedInProfile (subdomain: string, domain?: string) {
    return this.config.setConfig('activeProfile', { subdomain, domain })
  }

  async loginInteractively (options?: Profile) {
    const subdomain = parseSubdomain(options?.subdomain || await CliUx.ux.prompt('Subdomain'))
    const domain = options?.domain
    const account = getAccount(subdomain, domain)
    const baseUrl = getBaseUrl(subdomain, domain)
    const email = await CliUx.ux.prompt('Email')
    const token = await CliUx.ux.prompt('API Token', { type: 'hide' })
    const authToken = this.createBasicAuthToken(email, token)
    const testAuth = await axios.get(
      `${baseUrl}/api/v2/account/settings.json`,
      {
        headers: { Authorization: authToken },
        validateStatus: function (status) { return status < 500 },
        adapter: 'fetch'
      })

    if (testAuth.status === 200 && this.secureStore) {
      const record = serializeCredential({
        version: 2,
        type: 'api_token',
        authHeader: authToken
      })
      await this.secureStore.setSecret(account, record)
      await this.setLoggedInProfile(subdomain, domain)

      return true
    }

    return false
  }

  async loginViaOAuth (options: { subdomain: string; domain?: string; clientId: string }): Promise<boolean> {
    if (!this.secureStore) {
      throw new CLIError(chalk.red('Secure credentials store not found.'))
    }

    const subdomain = parseSubdomain(options.subdomain)
    const domain = options.domain
    const clientId = options.clientId
    const account = getAccount(subdomain, domain)

    const pkce = oauth.generatePkce()
    const state = oauth.generateState()

    const authorizeUrl = oauth.buildAuthorizeUrl({
      subdomain,
      domain,
      clientId,
      redirectUri: OAUTH_REDIRECT_URI,
      scope: OAUTH_DEFAULT_SCOPE,
      state,
      codeChallenge: pkce.challenge
    })

    CliUx.ux.log(`Opening browser to: ${authorizeUrl}`)
    CliUx.ux.log('If the browser does not open, copy and paste the URL above.')

    let code: string
    try {
      const codePromise = loopback.awaitLoopbackCode({
        port: OAUTH_LOOPBACK_PORT,
        path: OAUTH_LOOPBACK_PATH,
        expectedState: state
      })
      openBrowser.openBrowser(authorizeUrl)
      code = await codePromise
    } catch (err) {
      CliUx.ux.log(chalk.red((err as Error).message))
      return false
    }

    let tokens: oauth.TokenResult
    try {
      tokens = await oauth.exchangeCodeForToken({
        subdomain,
        domain,
        clientId,
        code,
        redirectUri: OAUTH_REDIRECT_URI,
        codeVerifier: pkce.verifier,
        scope: OAUTH_DEFAULT_SCOPE
      })
    } catch (err) {
      CliUx.ux.log(chalk.red((err as Error).message))
      return false
    }

    const record = serializeCredential({
      version: 2,
      type: 'oauth',
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      clientId
    })
    await this.secureStore.setSecret(account, record)
    await this.setLoggedInProfile(subdomain, domain)
    return true
  }

  async refreshOAuthToken (): Promise<string | undefined> {
    if (!this.secureStore) return undefined
    const profile = await this.getLoggedInProfile()
    if (!profile?.subdomain) return undefined

    const account = getAccount(profile.subdomain, profile.domain)
    const stored = await this.secureStore.getSecret(account)
    const record = parseCredential(stored ?? null)
    if (!record || record.type !== 'oauth' || !record.refreshToken) return undefined

    const tokens = await oauth.refreshAccessToken({
      subdomain: profile.subdomain,
      domain: profile.domain,
      clientId: record.clientId,
      refreshToken: record.refreshToken
    })

    const updated = serializeCredential({
      version: 2,
      type: 'oauth',
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken ?? record.refreshToken,
      clientId: record.clientId
    })
    await this.secureStore.setSecret(account, updated)
    return `Bearer ${tokens.accessToken}`
  }

  async logout () {
    if (!this.secureStore) {
      throw new CLIError(chalk.red('Secure credentials store not found.'))
    }

    const profile = await this.getLoggedInProfile()
    if (!profile?.subdomain) throw new CLIError(chalk.red('Failed to log out: no active profile found.'))
    await this.config.removeConfig('activeProfile')
    const deleted = await this.secureStore.deleteSecret(getAccount(profile.subdomain, profile.domain))
    if (!deleted) throw new CLIError(chalk.red('Failed to log out: Account, Service not found.'))

    return true
  }

  async getSavedProfiles () {
    return this.secureStore && this.secureStore.getAllCredentials()
  }
}
