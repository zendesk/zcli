import SecureStore from './secureStore'
import Auth from './auth'
import { CLIError } from '@oclif/core/lib/errors'
import * as chalk from 'chalk'
import { EnvVars, varExists } from './env'
import { getBaseUrl, getDomain, getSubdomain } from './requestUtils'
import * as path from 'path'
import * as fs from 'fs';

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
// export const requestAPI = async (url: string, options: any = {}, json = false) => {
//   const requestConfig = await createRequestConfig(url, options)
//   return axios.request(requestConfig)
// }
export const requestAPI = async (url: string, options: any = {}, json = false) => {
  const requestConfig = await createRequestConfig(url, options)

  // if requestConfig.url has a protocol, then we need to ignore the baseURL
  if (requestConfig.url.includes('://')) {
    requestConfig.baseURL = ''
  }

  const trimmedBaseUrl = requestConfig.baseURL.replace(/\/+$/, '')
  const trimmedUrl = requestConfig.url.replace(/^\/+/, '')

  const concatenatedUrl = [trimmedBaseUrl, trimmedUrl].filter(Boolean).join('/')

  const stringifiedBody = typeof requestConfig.data === 'string' ? requestConfig.data : JSON.stringify(requestConfig.data)

  const response = await fetch(concatenatedUrl, {
    method: requestConfig.method,
    headers: requestConfig.headers,
    body: stringifiedBody,
  })
  console.log('response', response)

  if (response === undefined) {
    // fetch called with:
    require('fs').writeFileSync(path.join(__dirname, 'request11.json'), JSON.stringify([
      concatenatedUrl,
      {
        trimmedUrl,
        method: requestConfig.method,
        headers: requestConfig.headers,
        body: stringifiedBody,
        requestConfig: requestConfig
      }
    ], null, 2))
}

  // if (!response.ok) {
  //   throw new Error(`HTTP error! status: ${response.status}`)
  // }

  let data = null;
  
  try {
    data = await response.json()
  } catch (e) {
    data = await response.text()
  }

  try {
    fs.writeFileSync(path.join(__dirname, 'data.json'), JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error writing data to file:', error);
  }

  return {
    config: requestConfig,
    status: response.status,
    data,
  }
}
