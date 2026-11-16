import { expect } from 'chai'
import { createHash, generateKeyPairSync } from 'crypto'
import { Readable } from 'stream'
import { TextDecoder } from 'util'
import { compactDecrypt, decodeProtectedHeader } from 'jose'
import {
  CLIENT_SECRET_FIELD,
  ENVELOPE_PREFIX_V1,
  MAX_SECRET_BYTES,
  encryptClientSecret,
  keyFingerprint,
  readSecretFromStdin,
  validatePublicKeyPem
} from './encrypt'

const rsaKeyPair = generateKeyPairSync('rsa', { modulusLength: 2048 })
const rsaPublicKeyPem = rsaKeyPair.publicKey.export({ type: 'spki', format: 'pem' }).toString()
const rsaPrivateKeyPem = rsaKeyPair.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString()
const ecPublicKeyPem = generateKeyPairSync('ec', { namedCurve: 'prime256v1' })
  .publicKey.export({ type: 'spki', format: 'pem' }).toString()

// Same wrap the implementation uses: this repo's older @types/node Buffer type
// is not assignable to the generic Uint8Array the current TypeScript lib types expect.
const spkiDer = new Uint8Array(rsaKeyPair.publicKey.export({ type: 'spki', format: 'der' }))
const expectedKid = createHash('sha256').update(spkiDer).digest('base64url')

function streamOf (...chunks: Array<string | Uint8Array>): Readable {
  return Readable.from(chunks)
}

async function captureError (fn: () => Promise<unknown>): Promise<Error> {
  try {
    await fn()
  } catch (error) {
    return error as Error
  }
  throw new Error('Expected the operation to fail, but it succeeded')
}

describe('validatePublicKeyPem', () => {
  it('should accept a valid RSA public key PEM', () => {
    expect(() => validatePublicKeyPem(rsaPublicKeyPem)).to.not.throw()
  })

  it('should reject a private-key PEM', () => {
    expect(() => validatePublicKeyPem(rsaPrivateKeyPem)).to.throw('not a private key')
  })

  it('should reject a malformed PEM', () => {
    expect(() => validatePublicKeyPem('-----BEGIN PUBLIC KEY-----\nnot-base64\n-----END PUBLIC KEY-----\n'))
      .to.throw('not a valid PEM public key')
  })

  it('should reject a non-RSA public key', () => {
    expect(() => validatePublicKeyPem(ecPublicKeyPem)).to.throw('must be an RSA public key')
  })
})

describe('keyFingerprint', () => {
  it('should be the base64url SHA-256 of the DER SPKI bytes', () => {
    expect(keyFingerprint(rsaPublicKeyPem)).to.equal(expectedKid)
  })
})

describe('encryptClientSecret', () => {
  it('should return an enc:v1: envelope containing a compact JWE', async () => {
    const envelope = await encryptClientSecret(new TextEncoder().encode('super-secret'), rsaPublicKeyPem)

    expect(envelope.startsWith(ENVELOPE_PREFIX_V1)).to.equal(true)
    const compactJwe = envelope.slice(ENVELOPE_PREFIX_V1.length)
    expect(compactJwe.split('.')).to.have.lengthOf(5)
  })

  it('should encrypt with RSA-OAEP-256, A256GCM, and the key fingerprint as kid', async () => {
    const envelope = await encryptClientSecret(new TextEncoder().encode('super-secret'), rsaPublicKeyPem)
    const header = decodeProtectedHeader(envelope.slice(ENVELOPE_PREFIX_V1.length))

    expect(header.alg).to.equal('RSA-OAEP-256')
    expect(header.enc).to.equal('A256GCM')
    expect(header.kid).to.equal(expectedKid)
  })

  it('should bind the payload to the client_secret field and decrypt with the private key', async () => {
    const envelope = await encryptClientSecret(new TextEncoder().encode('super-secret'), rsaPublicKeyPem)
    const { plaintext } = await compactDecrypt(envelope.slice(ENVELOPE_PREFIX_V1.length), rsaKeyPair.privateKey)
    const payload = JSON.parse(new TextDecoder().decode(plaintext))

    expect(payload).to.deep.equal({ field: CLIENT_SECRET_FIELD, value: 'super-secret' })
    expect(CLIENT_SECRET_FIELD).to.equal('authentication.client_secret')
  })

  it('should preserve multi-line and whitespace secrets exactly', async () => {
    const secret = 'line1\nline2  trailing-space '
    const envelope = await encryptClientSecret(new TextEncoder().encode(secret), rsaPublicKeyPem)
    const { plaintext } = await compactDecrypt(envelope.slice(ENVELOPE_PREFIX_V1.length), rsaKeyPair.privateKey)

    expect(JSON.parse(new TextDecoder().decode(plaintext)).value).to.equal(secret)
  })

  it('should reject an empty secret', async () => {
    const error = await captureError(() => encryptClientSecret(new Uint8Array(0), rsaPublicKeyPem))
    expect(error.message).to.contain('cannot be empty')
  })

  it('should reject a secret over the size limit', async () => {
    const error = await captureError(() =>
      encryptClientSecret(new Uint8Array(MAX_SECRET_BYTES + 1), rsaPublicKeyPem))
    expect(error.message).to.contain(`${MAX_SECRET_BYTES}-byte limit`)
  })

  it('should reject a private key as the encryption key', async () => {
    const error = await captureError(() =>
      encryptClientSecret(new TextEncoder().encode('super-secret'), rsaPrivateKeyPem))
    expect(error.message).to.contain('not a private key')
  })
})

describe('readSecretFromStdin', () => {
  it('should read the secret and strip a trailing LF', async () => {
    const secret = await readSecretFromStdin(streamOf('super-secret\n'))
    expect(new TextDecoder().decode(secret)).to.equal('super-secret')
  })

  it('should strip a trailing CRLF', async () => {
    const secret = await readSecretFromStdin(streamOf('super-secret\r\n'))
    expect(new TextDecoder().decode(secret)).to.equal('super-secret')
  })

  it('should not alter a secret without a trailing newline', async () => {
    const secret = await readSecretFromStdin(streamOf('super-secret'))
    expect(new TextDecoder().decode(secret)).to.equal('super-secret')
  })

  it('should strip only one trailing line ending', async () => {
    const secret = await readSecretFromStdin(streamOf('super-secret\n\n'))
    expect(new TextDecoder().decode(secret)).to.equal('super-secret\n')
  })

  it('should join multiple chunks', async () => {
    const secret = await readSecretFromStdin(streamOf('super', '-', 'secret\n'))
    expect(new TextDecoder().decode(secret)).to.equal('super-secret')
  })

  it('should accept binary chunks', async () => {
    const secret = await readSecretFromStdin(streamOf(new TextEncoder().encode('super-secret\n')))
    expect(new TextDecoder().decode(secret)).to.equal('super-secret')
  })

  it('should reject input over the size limit', async () => {
    const error = await captureError(() =>
      readSecretFromStdin(streamOf('x'.repeat(MAX_SECRET_BYTES + 1))))
    expect(error.message).to.contain(`${MAX_SECRET_BYTES}-byte limit`)
  })
})
