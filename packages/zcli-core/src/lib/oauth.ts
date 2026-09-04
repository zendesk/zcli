import * as crypto from 'crypto'
import * as http from 'http'
import axios from 'axios'
import { CLIError } from '@oclif/core/lib/errors'
import * as chalk from 'chalk'
import { getBaseUrl } from './requestUtils'

export const OAUTH_CLIENT_ID = 'zdg-zcli-oauth'
export const OAUTH_SCOPE = 'read write'
export const OAUTH_REDIRECT_PORTS = [19186, 19187, 19188]
export const OAUTH_CALLBACK_TIMEOUT_MS = 5 * 60 * 1000

export const ERR_PORTS_IN_USE = `Unable to start a local server for OAuth login. Ports ${OAUTH_REDIRECT_PORTS.join(', ')} are all in use. Please free up one of these ports and try again.`

export interface PKCEPair { codeVerifier: string; codeChallenge: string }

export interface OAuthTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

export interface ClientCredentialsTokenResponse {
  access_token: string;
  expires_in: number;
}

export interface StoredOAuthSecret { accessToken: string; refreshToken: string; expiresAt: number }

export interface CallbackResult { code: string }

export const generateCodeVerifier = (): string => crypto.randomBytes(32).toString('base64url')

export const generateCodeChallenge = (verifier: string): string =>
  crypto.createHash('sha256').update(verifier).digest('base64url')

export const generatePKCEPair = (): PKCEPair => {
  const codeVerifier = generateCodeVerifier()
  return { codeVerifier, codeChallenge: generateCodeChallenge(codeVerifier) }
}

export const generateState = (): string => crypto.randomBytes(16).toString('base64url')

export const buildAuthorizeUrl = (params: {
  subdomain: string;
  domain?: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
}): string => {
  const { subdomain, domain, redirectUri, state, codeChallenge } = params
  const url = new URL(`${getBaseUrl(subdomain, domain)}/oauth/authorizations/new`)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('client_id', OAUTH_CLIENT_ID)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('scope', OAUTH_SCOPE)
  url.searchParams.set('state', state)
  url.searchParams.set('code_challenge', codeChallenge)
  url.searchParams.set('code_challenge_method', 'S256')
  return url.toString()
}

const escapeHtml = (text: string): string => {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }
  return text.replace(/[&<>"']/g, char => map[char])
}

const renderSuccessHtml = (): string =>
  '<html><body><h1>Login successful</h1><p>You can close this window and return to your terminal.</p></body></html>'

const renderErrorHtml = (error: string, description?: string): string =>
  `<html><body><h1>Login failed</h1><p>${escapeHtml(description || error)}</p></body></html>`

const listen = (server: http.Server, port: number): Promise<void> =>
  new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(port, () => {
      server.removeListener('error', reject)
      resolve()
    })
  })

export const startCallbackServer = async (expectedState: string, ports: number[] = OAUTH_REDIRECT_PORTS): Promise<{
  port: number;
  waitForCallback: () => Promise<CallbackResult>;
  close: () => void;
}> => {
  let server: http.Server | undefined
  let boundPort: number | undefined

  for (const port of ports) {
    const candidate = http.createServer()
    try {
      await listen(candidate, port)
      server = candidate
      boundPort = port
      break
    } catch (error) {
      candidate.removeAllListeners()
    }
  }

  if (!server || !boundPort) {
    throw new CLIError(chalk.red(ERR_PORTS_IN_USE))
  }

  const boundServer = server

  const waitForCallback = (): Promise<CallbackResult> => {
    return new Promise((resolve, reject) => {
      let settled = false

      const finish = (fn: () => void) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        boundServer.close()
        fn()
      }

      const timer = setTimeout(() => {
        finish(() => reject(new CLIError(chalk.red('Login timed out. Please try again.'))))
      }, OAUTH_CALLBACK_TIMEOUT_MS)

      boundServer.on('request', (req, res) => {
        const url = new URL(req.url || '/', 'http://localhost')
        const state = url.searchParams.get('state')

        if (state !== expectedState) {
          res.writeHead(404, { 'Content-Type': 'text/html' })
          res.end()
          return
        }

        const error = url.searchParams.get('error')
        const code = url.searchParams.get('code')

        if (error) {
          const description = url.searchParams.get('error_description') || undefined
          res.writeHead(200, { 'Content-Type': 'text/html' })
          res.end(renderErrorHtml(error, description))
          finish(() => reject(new CLIError(chalk.red(`Login failed: ${description || error}`))))
          return
        }

        if (!code) {
          res.writeHead(200, { 'Content-Type': 'text/html' })
          res.end(renderErrorHtml('invalid_request', 'Login failed: missing authorization code.'))
          finish(() => reject(new CLIError(chalk.red('Login failed: missing authorization code.'))))
          return
        }

        res.writeHead(200, { 'Content-Type': 'text/html' })
        res.end(renderSuccessHtml())
        finish(() => resolve({ code }))
      })
    })
  }

  const close = () => {
    boundServer.close()
  }

  return { port: boundPort, waitForCallback, close }
}

export const exchangeCodeForToken = async (params: {
  subdomain: string;
  domain?: string;
  code: string;
  codeVerifier: string;
  redirectUri: string;
}): Promise<OAuthTokenResponse> => {
  const { subdomain, domain, code, codeVerifier, redirectUri } = params
  const baseUrl = getBaseUrl(subdomain, domain)

  const response = await axios.post(
    `${baseUrl}/oauth/tokens`,
    {
      grant_type: 'authorization_code',
      code,
      client_id: OAUTH_CLIENT_ID,
      code_verifier: codeVerifier,
      redirect_uri: redirectUri
    },
    {
      validateStatus: (status: number) => status < 500,
      adapter: 'fetch'
    }
  )

  if (response.status !== 200) {
    throw new CLIError(chalk.red('Failed to exchange authorization code for tokens.'))
  }

  return response.data as OAuthTokenResponse
}

export const refreshAccessToken = async (params: {
  subdomain: string;
  domain?: string;
  refreshToken: string;
}): Promise<OAuthTokenResponse> => {
  const { subdomain, domain, refreshToken } = params
  const baseUrl = getBaseUrl(subdomain, domain)

  const response = await axios.post(
    `${baseUrl}/oauth/tokens`,
    {
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: OAUTH_CLIENT_ID
    },
    {
      validateStatus: (status: number) => status < 500,
      adapter: 'fetch'
    }
  )

  if (response.status !== 200) {
    throw new CLIError(chalk.red('Failed to refresh access token.'))
  }

  return response.data as OAuthTokenResponse
}

export const fetchClientCredentialsToken = async (params: {
  subdomain: string;
  domain?: string;
  clientId: string;
  clientSecret: string;
}): Promise<ClientCredentialsTokenResponse> => {
  const { subdomain, domain, clientId, clientSecret } = params
  const baseUrl = getBaseUrl(subdomain, domain)

  const response = await axios.post(
    `${baseUrl}/oauth/tokens`,
    {
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
      scope: OAUTH_SCOPE
    },
    {
      validateStatus: (status: number) => status < 500,
      adapter: 'fetch'
    }
  )

  const token = response.data as Partial<ClientCredentialsTokenResponse> & {
    error?: string;
    error_description?: string;
  }
  if (
    (response.status !== 200 && response.status !== 201) ||
    typeof token.access_token !== 'string'
  ) {
    const details = [token.error, token.error_description].filter(Boolean).join(': ')
    throw new CLIError(chalk.red(
      `Failed to obtain an access token using OAuth client credentials.${details ? ` ${details}` : ''}`
    ))
  }

  const expiresIn = typeof token.expires_in === 'number' && token.expires_in > 0
    ? token.expires_in
    : 1800

  return {
    access_token: token.access_token,
    expires_in: expiresIn
  }
}

export const encodeOAuthSecret = (accessToken: string, refreshToken: string, expiresIn: number): string => {
  const secret: StoredOAuthSecret = {
    accessToken,
    refreshToken,
    expiresAt: Date.now() + expiresIn * 1000
  }
  return JSON.stringify(secret)
}

export const decodeOAuthSecret = (raw: string): StoredOAuthSecret | undefined => {
  try {
    const parsed = JSON.parse(raw)
    if (
      parsed &&
      typeof parsed === 'object' &&
      typeof parsed.accessToken === 'string' &&
      typeof parsed.refreshToken === 'string' &&
      typeof parsed.expiresAt === 'number'
    ) {
      return parsed as StoredOAuthSecret
    }
    return undefined
  } catch (error) {
    return undefined
  }
}
