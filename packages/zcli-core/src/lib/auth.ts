import { CLIError } from '@oclif/core/lib/errors'
import * as chalk from 'chalk'
import { CliUx } from '@oclif/core'
import Config from './config'
import axios from 'axios'
import SecureStore from './secureStore'
import { Profile } from '../types'
import { parseSubdomain } from './authUtils'

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
      return this.createBasicAuthToken(`${ZENDESK_EMAIL}/token`, ZENDESK_API_TOKEN)
    } else if (ZENDESK_EMAIL && ZENDESK_PASSWORD) {
      return this.createBasicAuthToken(ZENDESK_EMAIL, ZENDESK_PASSWORD)
    } else {
      const profile = await this.getLoggedInProfile()
      if (profile && this.secureStore) {
        const authToken = await this.secureStore.getPassword(profile.subdomain)
        return authToken
      }

      return undefined
    }
  }

  createBasicAuthToken (email: string, passwordOrToken: string) {
    const plainToken = Buffer.from(`${email}:${passwordOrToken}`)
    return `Basic ${plainToken.toString('base64')}`
  }

  getLoggedInProfile () {
    return this.config.getConfig('activeProfile') as unknown as Profile
  }

  setLoggedInProfile (subdomain: string) {
    return this.config.setConfig('activeProfile', { subdomain })
  }

  async loginInteractively (options?: Profile) {
    const subdomain = parseSubdomain(options?.subdomain || await CliUx.ux.prompt('Subdomain'))
    const email = await CliUx.ux.prompt('Email')
    const password = await CliUx.ux.prompt('Password', { type: 'hide' })

    const authToken = this.createBasicAuthToken(email, password)
    const testAuth = await axios.get(
      `https://${subdomain}.zendesk.com/api/v2/account/settings.json`,
      {
        headers: { Authorization: authToken },
        validateStatus: function (status) { return status < 500 }
      })

    if (testAuth.status === 200 && this.secureStore) {
      await this.secureStore.setPassword(subdomain, authToken)
      await this.setLoggedInProfile(subdomain)

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
    const deleted = await this.secureStore.deletePassword(profile.subdomain)
    if (!deleted) throw new CLIError(chalk.red('Failed to log out: Account, Service not found.'))

    return true
  }

  async getSavedProfiles () {
    return this.secureStore && this.secureStore.getAllCredentials()
  }
}
