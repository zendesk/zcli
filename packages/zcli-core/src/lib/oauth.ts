import * as crypto from 'crypto'
import axios from 'axios'
import { CLIError } from '@oclif/core/lib/errors'
import * as chalk from 'chalk'
import { getBaseUrl } from './requestUtils'

export type Pkce = { verifier: string; challenge: string; method: 'S256' }

export const generatePkce = (): Pkce => {
  const verifier = crypto.randomBytes(32).toString('base64url')
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url')
  return { verifier, challenge, method: 'S256' }
}

export const generateState = (): string => {
  return crypto.randomBytes(16).toString('base64url')
}

export type AuthorizeParams = {
  subdomain: string;
  domain?: string;
  clientId: string;
  redirectUri: string;
  scope: string;
  state: string;
  codeChallenge: string;
}

export const buildAuthorizeUrl = (params: AuthorizeParams): string => {
  const url = new URL(`${getBaseUrl(params.subdomain, params.domain)}/oauth/authorizations/new`)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('client_id', params.clientId)
  url.searchParams.set('redirect_uri', params.redirectUri)
  url.searchParams.set('scope', params.scope)
  url.searchParams.set('state', params.state)
  url.searchParams.set('code_challenge', params.codeChallenge)
  url.searchParams.set('code_challenge_method', 'S256')
  return url.toString()
}

export type TokenExchangeParams = {
  subdomain: string;
  domain?: string;
  clientId: string;
  code: string;
  redirectUri: string;
  codeVerifier: string;
  scope: string;
}

export type TokenResult = {
  accessToken: string;
  refreshToken?: string;
  scope?: string;
}

export const exchangeCodeForToken = async (params: TokenExchangeParams): Promise<TokenResult> => {
  const tokenUrl = `${getBaseUrl(params.subdomain, params.domain)}/oauth/tokens`
  const body = {
    grant_type: 'authorization_code',
    code: params.code,
    client_id: params.clientId,
    redirect_uri: params.redirectUri,
    scope: params.scope,
    code_verifier: params.codeVerifier
  }
  const response = await axios.post(tokenUrl, body, {
    validateStatus: (status: number) => status < 500,
    adapter: 'fetch'
  })
  if (response.status < 200 || response.status >= 300) {
    const error = response.data?.error
    const description = response.data?.error_description
    const detail = [error, description].filter(Boolean).join(': ') || `HTTP ${response.status}`
    throw new CLIError(chalk.red(`OAuth token exchange failed: ${detail}`))
  }
  return {
    accessToken: response.data.access_token,
    refreshToken: response.data.refresh_token,
    scope: response.data.scope
  }
}

export type RefreshParams = {
  subdomain: string;
  domain?: string;
  clientId: string;
  refreshToken: string;
}

export const refreshAccessToken = async (params: RefreshParams): Promise<TokenResult> => {
  const tokenUrl = `${getBaseUrl(params.subdomain, params.domain)}/oauth/tokens`
  const body = {
    grant_type: 'refresh_token',
    refresh_token: params.refreshToken,
    client_id: params.clientId
  }
  const response = await axios.post(tokenUrl, body, {
    validateStatus: (status: number) => status < 500,
    adapter: 'fetch'
  })
  if (response.status < 200 || response.status >= 300) {
    const error = response.data?.error
    const description = response.data?.error_description
    const detail = [error, description].filter(Boolean).join(': ') || `HTTP ${response.status}`
    throw new CLIError(chalk.red(`OAuth refresh failed: ${detail}`))
  }
  return {
    accessToken: response.data.access_token,
    refreshToken: response.data.refresh_token,
    scope: response.data.scope
  }
}
