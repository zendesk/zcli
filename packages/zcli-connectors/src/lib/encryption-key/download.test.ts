/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-unused-expressions */

import { expect } from 'chai'
import { generateKeyPairSync } from 'crypto'
import { promises as fs } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import * as sinon from 'sinon'
import { request } from '@zendesk/zcli-core'
import {
  ENCRYPTION_KEY_ENDPOINT,
  downloadEncryptionKey,
  validateEncryptionKeyResponse
} from './download'

const rsaKeyPair = generateKeyPairSync('rsa', { modulusLength: 2048 })
const rsaPublicKeyPem = rsaKeyPair.publicKey.export({ type: 'spki', format: 'pem' }).toString()
const rsaPrivateKeyPem = rsaKeyPair.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString()
const ecPublicKeyPem = generateKeyPairSync('ec', { namedCurve: 'prime256v1' })
  .publicKey.export({ type: 'spki', format: 'pem' }).toString()

async function captureError (fn: () => Promise<void>): Promise<Error> {
  try {
    await fn()
  } catch (error) {
    return error as Error
  }
  throw new Error('Expected the operation to fail, but it succeeded')
}

describe('validateEncryptionKeyResponse', () => {
  it('should return the PEM for a valid RSA public key response', () => {
    const pem = validateEncryptionKeyResponse({ public_key: rsaPublicKeyPem })
    expect(pem).to.equal(rsaPublicKeyPem.replace(/\s+$/, '') + '\n')
  })

  it('should normalize only the terminal newline', () => {
    const withoutNewline = rsaPublicKeyPem.replace(/\s+$/, '')
    expect(validateEncryptionKeyResponse({ public_key: withoutNewline })).to.equal(rsaPublicKeyPem)
    expect(validateEncryptionKeyResponse({ public_key: rsaPublicKeyPem + '\n\n' })).to.equal(rsaPublicKeyPem)
  })

  it('should reject a non-object response', () => {
    expect(() => validateEncryptionKeyResponse('not an object')).to.throw('invalid encryption-key response')
    expect(() => validateEncryptionKeyResponse(null)).to.throw('invalid encryption-key response')
  })

  it('should reject a missing public_key', () => {
    expect(() => validateEncryptionKeyResponse({})).to.throw('invalid encryption-key response')
  })

  it('should reject a non-string public_key', () => {
    expect(() => validateEncryptionKeyResponse({ public_key: 42 })).to.throw('invalid encryption-key response')
  })

  it('should reject an empty public_key', () => {
    expect(() => validateEncryptionKeyResponse({ public_key: '   ' })).to.throw('invalid encryption-key response')
  })

  it('should reject a malformed PEM', () => {
    expect(() => validateEncryptionKeyResponse({ public_key: '-----BEGIN PUBLIC KEY-----\nnot-base64\n-----END PUBLIC KEY-----\n' }))
      .to.throw('malformed PEM')
  })

  it('should reject a private-key PEM', () => {
    expect(() => validateEncryptionKeyResponse({ public_key: rsaPrivateKeyPem })).to.throw('unsupported public key')
  })

  it('should reject a non-RSA public key', () => {
    expect(() => validateEncryptionKeyResponse({ public_key: ecPublicKeyPem })).to.throw('unsupported public key')
  })
})

describe('downloadEncryptionKey', () => {
  let requestAPIStub: sinon.SinonStub
  let workDir: string
  let outputPath: string

  beforeEach(async () => {
    requestAPIStub = sinon.stub(request, 'requestAPI')
    workDir = await fs.mkdtemp(join(tmpdir(), 'zcli-encryption-key-'))
    outputPath = join(workDir, 'public-key.pem')
  })

  afterEach(async () => {
    sinon.restore()
    await fs.rm(workDir, { recursive: true, force: true })
  })

  describe('request behavior', () => {
    it('should call the encryption-key endpoint once with GET and no body', async () => {
      requestAPIStub.resolves({ status: 200, data: { public_key: rsaPublicKeyPem } })

      await downloadEncryptionKey(outputPath)

      expect(requestAPIStub.calledOnce).to.equal(true)
      expect(requestAPIStub.calledWithExactly(ENCRYPTION_KEY_ENDPOINT, { method: 'GET' })).to.equal(true)
      expect(ENCRYPTION_KEY_ENDPOINT).to.equal('/flowstate/connectors/public/encryption-key')
      expect((requestAPIStub.firstCall.args[1] as any).data).to.equal(undefined)
    })
  })

  describe('filesystem behavior', () => {
    it('should write the exact validated PEM to the destination', async () => {
      requestAPIStub.resolves({ status: 200, data: { public_key: rsaPublicKeyPem } })

      await downloadEncryptionKey(outputPath)

      const written = await fs.readFile(outputPath, 'utf-8')
      expect(written).to.equal(rsaPublicKeyPem.replace(/\s+$/, '') + '\n')
    })

    it('should preserve a final newline', async () => {
      const withoutNewline = rsaPublicKeyPem.replace(/\s+$/, '')
      requestAPIStub.resolves({ status: 200, data: { public_key: withoutNewline } })

      await downloadEncryptionKey(outputPath)

      const written = await fs.readFile(outputPath, 'utf-8')
      expect(written.endsWith('\n')).to.equal(true)
    })

    it('should atomically replace an existing key file after success', async () => {
      await fs.writeFile(outputPath, 'old-key-material\n', 'utf-8')
      requestAPIStub.resolves({ status: 200, data: { public_key: rsaPublicKeyPem } })

      await downloadEncryptionKey(outputPath)

      const written = await fs.readFile(outputPath, 'utf-8')
      expect(written).to.not.contain('old-key-material')
      expect(written).to.contain('BEGIN PUBLIC KEY')
    })

    it('should leave an existing file unchanged when the request fails', async () => {
      await fs.writeFile(outputPath, 'previous-valid-key\n', 'utf-8')
      requestAPIStub.rejects(Object.assign(new Error('Service Unavailable'), { response: { status: 503 } }))

      const error = await captureError(() => downloadEncryptionKey(outputPath))

      expect(error.message).to.contain('temporarily unavailable')
      expect(await fs.readFile(outputPath, 'utf-8')).to.equal('previous-valid-key\n')
    })

    it('should leave an existing file unchanged when validation fails', async () => {
      await fs.writeFile(outputPath, 'previous-valid-key\n', 'utf-8')
      requestAPIStub.resolves({ status: 200, data: { public_key: 'not-a-pem' } })

      const error = await captureError(() => downloadEncryptionKey(outputPath))

      expect(error.message).to.contain('invalid encryption-key response')
      expect(await fs.readFile(outputPath, 'utf-8')).to.equal('previous-valid-key\n')
    })

    it('should remove temporary files after failure', async () => {
      requestAPIStub.resolves({ status: 200, data: { public_key: 'not-a-pem' } })

      await captureError(() => downloadEncryptionKey(outputPath))

      const entries = await fs.readdir(workDir)
      expect(entries.filter(entry => entry.endsWith('.tmp'))).to.deep.equal([])
    })

    it('should report a missing parent directory without making a request', async () => {
      requestAPIStub.resolves({ status: 200, data: { public_key: rsaPublicKeyPem } })
      const missingPath = join(workDir, 'does-not-exist', 'public-key.pem')

      const error = await captureError(() => downloadEncryptionKey(missingPath))

      expect(error.message).to.match(/parent directory .* does not exist/)
      expect(requestAPIStub.called).to.equal(false)
    })
  })

  describe('error mapping', () => {
    it('should map 401 to an authentication message', async () => {
      requestAPIStub.resolves({ status: 401, data: { error: 'unauthorized' } })

      const error = await captureError(() => downloadEncryptionKey(outputPath))

      expect(error.message).to.match(/HTTP 401/)
      expect(error.message).to.match(/[Aa]uthenticate/)
    })

    it('should map 403 to an administrator message', async () => {
      requestAPIStub.resolves({ status: 403, data: { error: 'forbidden' } })

      const error = await captureError(() => downloadEncryptionKey(outputPath))

      expect(error.message).to.match(/HTTP 403/)
      expect(error.message).to.match(/account administrator/)
    })

    it('should map a thrown 503 to an availability message', async () => {
      requestAPIStub.rejects(Object.assign(new Error('Request failed with status code 503'), { response: { status: 503 } }))

      const error = await captureError(() => downloadEncryptionKey(outputPath))

      expect(error.message).to.match(/temporarily unavailable/)
      expect(error.message).to.match(/503/)
    })

    it('should map a resolved 503 to an availability message', async () => {
      requestAPIStub.resolves({ status: 503, data: { error: 'unavailable' } })

      const error = await captureError(() => downloadEncryptionKey(outputPath))

      expect(error.message).to.match(/temporarily unavailable/)
    })

    it('should map network failures to a safe message', async () => {
      requestAPIStub.rejects(new Error('getaddrinfo ENOTFOUND example.com'))

      const error = await captureError(() => downloadEncryptionKey(outputPath))

      expect(error.message).to.match(/Failed to download the encryption key: getaddrinfo ENOTFOUND/)
    })

    it('should not include PEM content in validation errors', async () => {
      requestAPIStub.resolves({ status: 200, data: { public_key: rsaPrivateKeyPem } })

      const error = await captureError(() => downloadEncryptionKey(outputPath))

      expect(error.message).to.not.contain('PRIVATE KEY')
    })
  })
})
