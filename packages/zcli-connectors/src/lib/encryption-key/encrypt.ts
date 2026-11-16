import { createHash, createPublicKey } from 'crypto'
import { Readable } from 'stream'
import { TextDecoder, TextEncoder } from 'util'
import { CompactEncrypt, importSPKI } from 'jose'

export const ENVELOPE_PREFIX_V1 = 'enc:v1:'
export const CLIENT_SECRET_FIELD = 'authentication.client_secret'

// Flowstate bounds the whole decrypted JSON payload ({"field":...,"value":...})
// to 4 KiB. Reject oversized secrets client-side so the author gets a clear
// error instead of a provisioning failure after upload.
export const MAX_SECRET_BYTES = 4000

/**
 * Validates that publicKeyPem is an RSA public key of at least 2048 bits.
 * Private-key PEMs are rejected explicitly: Node would otherwise silently
 * derive a public key, leaking a private key into the encryption path.
 */
export function validatePublicKeyPem (publicKeyPem: string): void {
  if (publicKeyPem.includes('PRIVATE KEY-----')) {
    throw new Error('The encryption key must be an RSA public key, not a private key.')
  }

  let key
  try {
    key = createPublicKey(publicKeyPem)
  } catch {
    throw new Error('The encryption key is not a valid PEM public key.')
  }

  if (key.asymmetricKeyType !== 'rsa') {
    throw new Error(`The encryption key must be an RSA public key, received ${key.asymmetricKeyType ?? 'unknown'}.`)
  }

  // asymmetricKeyDetails is not declared in this repo's @types/node version.
  const details = (key as { asymmetricKeyDetails?: { modulusLength?: number } }).asymmetricKeyDetails
  const modulusLength = details?.modulusLength
  if (modulusLength !== undefined && modulusLength < 2048) {
    throw new Error(`The encryption key must be at least 2048-bit RSA, received ${modulusLength}-bit.`)
  }
}

/** base64url SHA-256 fingerprint of the public key's DER SPKI bytes. */
export function keyFingerprint (publicKeyPem: string): string {
  // new Uint8Array(...) copies into a fresh ArrayBuffer: this repo's older
  // @types/node Buffer type is not assignable to the generic Uint8Array the
  // current TypeScript lib types expect.
  const spki = new Uint8Array(createPublicKey(publicKeyPem).export({ type: 'spki', format: 'der' }))
  return createHash('sha256').update(spki).digest('base64url')
}

/**
 * Encrypts a publisher OAuth client secret for settings.json as a compact JWE
 * (RSA-OAEP-256 key encryption, A256GCM content encryption, protected kid
 * header) and returns the full enc:v1: envelope value.
 */
export async function encryptClientSecret (secret: Uint8Array, publicKeyPem: string): Promise<string> {
  validatePublicKeyPem(publicKeyPem)

  if (secret.length === 0) {
    throw new Error('The client secret cannot be empty.')
  }
  if (secret.length > MAX_SECRET_BYTES) {
    throw new Error(`The client secret exceeds the ${MAX_SECRET_BYTES}-byte limit.`)
  }

  const encryptionKey = await importSPKI(publicKeyPem, 'RSA-OAEP-256')
  const payload = new TextEncoder().encode(JSON.stringify({
    field: CLIENT_SECRET_FIELD,
    value: new TextDecoder().decode(secret)
  }))

  const compactJwe = await new CompactEncrypt(payload)
    .setProtectedHeader({
      alg: 'RSA-OAEP-256',
      enc: 'A256GCM',
      kid: keyFingerprint(publicKeyPem)
    })
    .encrypt(encryptionKey)

  return `${ENVELOPE_PREFIX_V1}${compactJwe}`
}

/**
 * Reads the client secret from a stream (stdin). A single trailing line ending
 * (CRLF or LF) is stripped so piping from a file or secret manager works, but
 * no other whitespace is altered. The secret must never arrive as an argument:
 * arguments are visible in shell history and process listings.
 */
export function readSecretFromStdin (stream: Readable): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const chunks: Uint8Array[] = []
    let byteLength = 0
    let failed = false

    stream.on('data', (chunk: Uint8Array | string) => {
      if (failed) return
      const buffer = typeof chunk === 'string' ? new TextEncoder().encode(chunk) : new Uint8Array(chunk)
      byteLength += buffer.length
      if (byteLength > MAX_SECRET_BYTES) {
        failed = true
        reject(new Error(`The client secret exceeds the ${MAX_SECRET_BYTES}-byte limit.`))
        return
      }
      chunks.push(buffer)
    })

    stream.on('end', () => {
      if (failed) return
      const input = new Uint8Array(byteLength)
      let offset = 0
      for (const chunk of chunks) {
        input.set(chunk, offset)
        offset += chunk.length
      }
      let end = input.length

      if (end >= 2 && input[end - 2] === 0x0d && input[end - 1] === 0x0a) {
        end -= 2
      } else if (end >= 1 && input[end - 1] === 0x0a) {
        end -= 1
      }

      resolve(input.subarray(0, end))
    })

    stream.on('error', (error: Error) => {
      if (failed) return
      failed = true
      reject(error)
    })
  })
}
