import { CLIError } from '@oclif/core/lib/errors'
import * as chalk from 'chalk'
import { CliUx } from '@oclif/core'
import Config from './config'
import open = require('open')
import SecureStore from './secureStore'
import { Profile } from '../types'
import { getAccount, parseSubdomain } from './authUtils'
import { SecretType } from './secretType'
import { EnvVars, varExists } from './env'
import {
  generatePKCEPair,
  generateState,
  buildAuthorizeUrl,
  startCallbackServer,
  exchangeCodeForToken,
  refreshAccessToken,
  fetchClientCredentialsToken,
  encodeOAuthSecret,
  decodeOAuthSecret
} from './oauth'

export interface AuthOptions {
  secureStore: SecureStore;
}

interface CachedClientCredentialsToken {
  accessToken: string;
  expiresAt: number;
  clientId: string;
}

const CLIENT_CREDENTIALS_TOKENS_KEY = 'clientCredentialsTokens'

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
    } else if (this.hasClientCredentialsEnvVars()) {
      return this.getClientCredentialsAuthorizationToken()
    } else if (ZENDESK_EMAIL && ZENDESK_API_TOKEN) {
      return this.createDeprecatedApiToken(ZENDESK_EMAIL, ZENDESK_API_TOKEN)
    } else if (ZENDESK_EMAIL && ZENDESK_PASSWORD) {
      return this.createBasicAuthToken(ZENDESK_EMAIL, ZENDESK_PASSWORD, SecretType.PASSWORD)
    } else {
      const profile = await this.getLoggedInProfile()
      if (profile && this.secureStore) {
        const account = getAccount(profile.subdomain, profile.domain)
        const rawSecret = await this.secureStore.getSecret(account)
        if (!rawSecret) return undefined

        const oauthSecret = decodeOAuthSecret(rawSecret)
        if (!oauthSecret) {
          console.warn(chalk.yellow('Warning: API token auth is deprecated. Run `zcli login` to upgrade to OAuth.'))
          return rawSecret
        }

        if (Date.now() < oauthSecret.expiresAt) {
          return `Bearer ${oauthSecret.accessToken}`
        }

        return this.refreshAndStoreOAuthSecret(account, profile, oauthSecret.refreshToken)
      }

      return undefined
    }
  }

  private async refreshAndStoreOAuthSecret (account: string, profile: Profile, refreshToken: string): Promise<string> {
    try {
      const refreshed = await refreshAccessToken({ subdomain: profile.subdomain, domain: profile.domain, refreshToken })
      const newSecret = encodeOAuthSecret(refreshed.access_token, refreshed.refresh_token, refreshed.expires_in)
      await this.secureStore?.setSecret(account, newSecret)
      return `Bearer ${refreshed.access_token}`
    } catch (error) {
      await this.secureStore?.deleteSecret(account)
      throw new CLIError(chalk.red('Your session has expired and could not be refreshed. Please run `zcli login` again.'))
    }
  }

  async forceRefreshAuthorizationToken (): Promise<string | undefined> {
    if (this.usesClientCredentials()) {
      return this.getClientCredentialsAuthorizationToken(true)
    }

    const profile = await this.getLoggedInProfile()
    if (!profile || !this.secureStore) return undefined

    const account = getAccount(profile.subdomain, profile.domain)
    const rawSecret = await this.secureStore.getSecret(account)
    if (!rawSecret) return undefined

    const oauthSecret = decodeOAuthSecret(rawSecret)
    if (!oauthSecret) return undefined

    return this.refreshAndStoreOAuthSecret(account, profile, oauthSecret.refreshToken)
  }

  private hasClientCredentialsEnvVars (): boolean {
    return varExists(EnvVars.OAUTH_CLIENT_ID, EnvVars.OAUTH_CLIENT_SECRET)
  }

  private usesClientCredentials (): boolean {
    return this.hasClientCredentialsEnvVars() &&
      !!process.env[EnvVars.SUBDOMAIN] &&
      !process.env[EnvVars.OAUTH_TOKEN]
  }

  private createDeprecatedApiToken (email: string, apiToken: string) {
    console.warn(chalk.yellow('Warning: API token authentication is deprecated, but will continue to be used until it is fully removed.'))
    return this.createBasicAuthToken(email, apiToken)
  }

  private async getClientCredentialsAuthorizationToken (forceRefresh = false): Promise<string> {
    const clientId = process.env[EnvVars.OAUTH_CLIENT_ID] as string
    const clientSecret = process.env[EnvVars.OAUTH_CLIENT_SECRET] as string

    const subdomain = process.env[EnvVars.SUBDOMAIN]
    if (!subdomain) {
      throw new CLIError(chalk.red('OAuth client credentials require ZENDESK_SUBDOMAIN.'))
    }
    const profile = { subdomain, domain: process.env[EnvVars.DOMAIN] }

    const account = getAccount(profile.subdomain, profile.domain)
    const tokens = await this.config.getConfig(CLIENT_CREDENTIALS_TOKENS_KEY) as Record<string, CachedClientCredentialsToken> | undefined
    const cachedToken = tokens?.[account]
    if (!forceRefresh && cachedToken?.clientId === clientId && Date.now() < cachedToken.expiresAt) {
      return `Bearer ${cachedToken.accessToken}`
    }

    const token = await fetchClientCredentialsToken({
      subdomain: profile.subdomain,
      domain: profile.domain,
      clientId,
      clientSecret
    })
    await this.config.setConfig(CLIENT_CREDENTIALS_TOKENS_KEY, {
      ...tokens,
      [account]: {
        accessToken: token.access_token,
        expiresAt: Date.now() + token.expires_in * 1000,
        clientId
      }
    })
    return `Bearer ${token.access_token}`
  }

  async loginWithOAuth (options?: Profile): Promise<boolean> {
    if (!this.secureStore) {
      throw new CLIError(chalk.red('Secure credentials store not found.'))
    }

    const subdomain = parseSubdomain(options?.subdomain || await CliUx.ux.prompt('Subdomain'))
    const domain = options?.domain
    const account = getAccount(subdomain, domain)

    const state = generateState()
    const { codeVerifier, codeChallenge } = generatePKCEPair()
    const { port, waitForCallback } = await startCallbackServer(state)
    const redirectUri = `http://localhost:${port}/`
    const authorizeUrl = buildAuthorizeUrl({ subdomain, domain, redirectUri, state, codeChallenge })

    console.log(`To continue, open this URL in your browser:\n${authorizeUrl}`)
    try {
      await open(authorizeUrl)
    } catch (error) {
      // Ignore - the URL was already printed above for the user to open manually.
    }

    const { code } = await waitForCallback()
    const tokenResponse = await exchangeCodeForToken({ subdomain, domain, code, codeVerifier, redirectUri })
    const secret = encodeOAuthSecret(tokenResponse.access_token, tokenResponse.refresh_token, tokenResponse.expires_in)

    await this.secureStore.setSecret(account, secret)
    await this.setLoggedInProfile(subdomain, domain)

    return true
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
