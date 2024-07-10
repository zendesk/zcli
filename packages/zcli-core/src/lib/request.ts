import axios from 'axios'
import SecureStore from './secureStore'
import Auth from './auth'
import { CLIError } from '@oclif/core/lib/errors'
import * as chalk from 'chalk'
import { EnvVars, varExists } from './env'
import { getBaseUrl, getDomain, getSubdomain } from './requestUtils'

const MSG_ENV_OR_LOGIN = 'Set the following environment variables: ZENDESK_SUBDOMAIN, ZENDESK_EMAIL, ZENDESK_API_TOKEN. Or try logging in via `zcli login -i`'
const ERR_AUTH_FAILED = `Authorization failed. ${MSG_ENV_OR_LOGIN}`
const ERR_ENV_SUBDOMAIN_NOT_FOUND = `No subdomain found. ${MSG_ENV_OR_LOGIN}`

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const createRequestConfig = async (url: string, options: any = {}) => {
  let auth
  if (
    varExists(EnvVars.SUBDOMAIN, EnvVars.OAUTH_TOKEN) ||
    varExists(EnvVars.SUBDOMAIN, EnvVars.EMAIL, EnvVars.API_TOKEN)
  ) {
    auth = new Auth()
  } else {
    const secureStore = new SecureStore()
    await secureStore.loadKeytar()
    auth = new Auth({ secureStore })
  }
  const [authToken, profileSubdomain, profileDomain] =
    await Promise.all([auth.getAuthorizationToken(), getSubdomain(auth), getDomain(auth)])
  if (!authToken) throw new CLIError(chalk.red(ERR_AUTH_FAILED))
  const subdomain = process.env[EnvVars.SUBDOMAIN] || profileSubdomain
  if (!subdomain) throw new CLIError(chalk.red(ERR_ENV_SUBDOMAIN_NOT_FOUND))
  const domain = process.env[EnvVars.SUBDOMAIN] ? process.env[EnvVars.DOMAIN] : profileDomain

  if (options.headers) {
    options.headers = { Authorization: authToken, ...options.headers }
  } else {
    options.headers = { Authorization: authToken }
  }
  const baseURL = getBaseUrl(subdomain, domain)

  return {
    baseURL,
    url,
    validateStatus: function (status: number) {
      return status < 500
    },
    ...options
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const requestAPI = async (url: string, options: any = {}, json = false) => {
  const requestConfig = await createRequestConfig(url, options)
  return axios.request(requestConfig)
}
