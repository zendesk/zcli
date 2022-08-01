import axios from 'axios'
import SecureStore from './secureStore'
import Auth from './auth'
import { CLIError } from '@oclif/core/lib/errors'
import * as chalk from 'chalk'
import { EnvVars, varExists } from './env'
import { getSubdomain } from './requestUtils'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const requestAPI = async (url: string, options: any = {}, json = false) => {
  let auth
  if (
    varExists(EnvVars.SUBDOMAIN, EnvVars.EMAIL, EnvVars.PASSWORD) ||
    varExists(EnvVars.SUBDOMAIN, EnvVars.EMAIL, EnvVars.API_TOKEN) ||
    varExists(EnvVars.SUBDOMAIN, EnvVars.OAUTH_TOKEN)
  ) {
    auth = new Auth()
  } else {
    const secureStore = new SecureStore()
    await secureStore.loadKeytar()
    auth = new Auth({ secureStore })
  }

  const authToken = await auth.getAuthorizationToken()
  const subdomain = process.env[EnvVars.SUBDOMAIN] || (await getSubdomain(auth))

  if (options.headers) {
    options.headers = { Authorization: authToken, ...options.headers }
  } else {
    options.headers = { Authorization: authToken }
  }

  if (authToken && subdomain) {
    return axios.request({
      baseURL: `https://${subdomain}.zendesk.com`,
      url: url,
      validateStatus: function (status) { return status < 500 },
      ...options
    })
  }

  throw new CLIError(chalk.red('Authorization Failed, try logging in via `zcli login -i`!'))
}
