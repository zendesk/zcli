export type ApiTokenRecord = {
  version: 2;
  type: 'api_token';
  authHeader: string;
}

export type OAuthRecord = {
  version: 2;
  type: 'oauth';
  accessToken: string;
  refreshToken?: string;
  clientId: string;
}

export type CredentialRecord = ApiTokenRecord | OAuthRecord

const CURRENT_VERSION = 2 as const

export const parseCredential = (raw: string | null | undefined): CredentialRecord | undefined => {
  if (!raw) return undefined

  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object' && parsed.version === CURRENT_VERSION) {
      if (parsed.type === 'oauth' && typeof parsed.accessToken === 'string' && typeof parsed.clientId === 'string') {
        return {
          version: CURRENT_VERSION,
          type: 'oauth',
          accessToken: parsed.accessToken,
          refreshToken: typeof parsed.refreshToken === 'string' ? parsed.refreshToken : undefined,
          clientId: parsed.clientId
        }
      }
      if (parsed.type === 'api_token' && typeof parsed.authHeader === 'string') {
        return {
          version: CURRENT_VERSION,
          type: 'api_token',
          authHeader: parsed.authHeader
        }
      }
    }
  } catch {
    // not JSON — fall through to legacy handling
  }

  return {
    version: CURRENT_VERSION,
    type: 'api_token',
    authHeader: raw
  }
}

export const serializeCredential = (record: CredentialRecord): string => {
  return JSON.stringify(record)
}
