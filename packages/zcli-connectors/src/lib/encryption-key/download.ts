import { createPublicKey, randomBytes } from 'crypto'
import { promises as fs, Stats } from 'fs'
import { basename, dirname, join, resolve } from 'path'
import { request } from '@zendesk/zcli-core'

export const ENCRYPTION_KEY_ENDPOINT = '/flowstate/connectors/public/encryption-key'

export interface EncryptionKeyResponse {
  public_key: string
}

/**
 * Validates the Flowstate encryption-key response and returns the normalized PEM.
 * Throws an actionable error when the response shape or key material is invalid.
 */
export function validateEncryptionKeyResponse (data: unknown): string {
  if (typeof data !== 'object' || data === null) {
    throw new Error('Flowstate returned an invalid encryption-key response.')
  }

  const publicKey = (data as Record<string, unknown>).public_key
  if (typeof publicKey !== 'string' || publicKey.trim() === '') {
    throw new Error('Flowstate returned an invalid encryption-key response.')
  }

  if (publicKey.includes('PRIVATE KEY-----')) {
    throw new Error('Flowstate returned an unsupported public key: expected an RSA public key.')
  }

  let asymmetricKeyType: string | undefined
  try {
    asymmetricKeyType = createPublicKey(publicKey).asymmetricKeyType
  } catch {
    throw new Error('Flowstate returned an invalid encryption-key response: malformed PEM public key.')
  }

  if (asymmetricKeyType !== 'rsa') {
    throw new Error(`Flowstate returned an unsupported public key: expected RSA, received ${asymmetricKeyType ?? 'unknown'}.`)
  }

  // Normalize only the terminal newline; never alter the PEM body.
  return publicKey.replace(/\s+$/, '') + '\n'
}

function messageForStatus (status: number): string {
  switch (status) {
  case 401:
    return 'Failed to download the encryption key (HTTP 401). Authenticate ZCLI and select the correct account profile (try `zcli login`).'
  case 403:
    return 'Failed to download the encryption key (HTTP 403). Use an account administrator profile authorized for public connector development.'
  case 503:
    return 'The connector encryption key is temporarily unavailable (HTTP 503). Retry later or contact Zendesk support.'
  default:
    return `Failed to download the encryption key (HTTP ${status}).`
  }
}

/**
 * Extracts only the HTTP status from an Axios-style error.
 * Never inspect or log the full error: it may carry authenticated request
 * configuration and authorization headers.
 */
function statusFromError (error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null) return undefined
  const response = (error as { response?: { status?: unknown } }).response
  if (response && typeof response.status === 'number') return response.status
  return undefined
}

/**
 * Downloads Flowstate's active public connector encryption key and writes it
 * atomically to outputPath. The destination is only replaced after the request
 * and validation succeed, so a failed refresh never destroys a valid key.
 */
export async function downloadEncryptionKey (outputPath: string): Promise<void> {
  const destination = resolve(outputPath)
  const parentDir = dirname(destination)

  let parentStat: Stats
  try {
    parentStat = await fs.stat(parentDir)
  } catch {
    throw new Error(`Failed to write the encryption key to ${destination}: parent directory ${parentDir} does not exist.`)
  }
  if (!parentStat.isDirectory()) {
    throw new Error(`Failed to write the encryption key to ${destination}: ${parentDir} is not a directory.`)
  }

  // requestAPI resolves for non-5xx statuses and throws for 5xx/network errors.
  let response: { status: number, data: unknown }
  try {
    response = await request.requestAPI(ENCRYPTION_KEY_ENDPOINT, {
      method: 'GET'
    })
  } catch (error) {
    const status = statusFromError(error)
    if (status !== undefined) {
      throw new Error(messageForStatus(status))
    }
    const safeMessage = error instanceof Error ? error.message : 'network request failed'
    throw new Error(`Failed to download the encryption key: ${safeMessage}`)
  }

  if (response.status !== 200) {
    throw new Error(messageForStatus(response.status))
  }

  const pem = validateEncryptionKeyResponse(response.data)

  const tempPath = join(parentDir, `.${basename(destination)}.${process.pid}.${randomBytes(6).toString('hex')}.tmp`)
  try {
    // Public material: normal public-file permissions (0644 subject to umask).
    await fs.writeFile(tempPath, pem, { encoding: 'utf-8', mode: 0o644 })
    await fs.rename(tempPath, destination)
  } catch (error) {
    await fs.unlink(tempPath).catch(() => undefined)
    const safeMessage = error instanceof Error ? error.message : String(error)
    throw new Error(`Failed to write the encryption key to ${destination}: ${safeMessage}`)
  }
}
