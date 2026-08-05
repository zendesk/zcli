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

const buildAuth = async (): Promise<Auth> => {
  if (
    varExists(EnvVars.SUBDOMAIN, EnvVars.OAUTH_TOKEN) ||
    varExists(EnvVars.SUBDOMAIN, EnvVars.EMAIL, EnvVars.API_TOKEN)
  ) {
    return new Auth()
  }
  const secureStore = new SecureStore()
  await secureStore.loadKeytar()
  return new Auth({ secureStore })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const createRequestConfig = async (url: string, options: any = {}, authOverride?: Auth) => {
  const auth = authOverride ?? await buildAuth()
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
  const auth = await buildAuth()
  const requestConfig = await createRequestConfig(url, options, auth)

  const response = await axios.request({
    ...requestConfig,
    adapter: 'fetch'
  })

  if (response.status !== 401) return response

  const refreshedToken = await auth.forceRefreshAuthorizationToken()
  if (!refreshedToken) return response

  return axios.request({
    ...requestConfig,
    headers: { ...requestConfig.headers, Authorization: refreshedToken },
    adapter: 'fetch'
  })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const requestRaw = async (url: string, options: any = {}) => {
  return axios.request({
    url,
    ...options,
    validateStatus: function (status: number) {
      return status < 500
    },
    adapter: 'fetch'
  })
}
