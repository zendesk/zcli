import { CLIError } from '@oclif/core/lib/errors'
import * as chalk from 'chalk'
import { CliUx } from '@oclif/core'
import Config from './config'
import SecureStore from './secureStore'
import { Profile } from '../types'
import { getAccount, parseSubdomain } from './authUtils'
import { getBaseUrl } from './requestUtils'
import { SecretType } from './secretType'

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
        const authToken = await this.secureStore.getSecret(getAccount(profile.subdomain, profile.domain))
        return authToken
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

    const testAuth = await fetch(`${baseUrl}/api/v2/account/settings.json`, {
      headers: {
        Authorization: authToken,
      }
    })
    
    if (testAuth.status === 200 && this.secureStore) {
      await this.secureStore.setSecret(account, authToken)
      await this.setLoggedInProfile(subdomain, domain)

      return true
    }

    return false
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
