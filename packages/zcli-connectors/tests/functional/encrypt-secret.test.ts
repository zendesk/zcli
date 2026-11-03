import { expect } from 'chai'
import { generateKeyPairSync } from 'crypto'
import { promises as fs } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { PassThrough } from 'stream'
import { TextDecoder } from 'util'
import * as sinon from 'sinon'
import { compactDecrypt } from 'jose'
import EncryptSecretCommand from '../../src/commands/connectors/encrypt-secret'
import { request } from '@zendesk/zcli-core'

const rsaKeyPair = generateKeyPairSync('rsa', { modulusLength: 2048 })
const rsaPublicKeyPem = rsaKeyPair.publicKey.export({ type: 'spki', format: 'pem' }).toString()
const rsaPrivateKeyPem = rsaKeyPair.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString()

const stdinDescriptor = Object.getOwnPropertyDescriptor(process, 'stdin')

async function decryptEnvelope (envelope: string): Promise<{ field: string, value: string }> {
  const { plaintext } = await compactDecrypt(envelope.replace(/^enc:v1:/, ''), rsaKeyPair.privateKey)
  return JSON.parse(new TextDecoder().decode(plaintext))
}

describe('encrypt-secret command', () => {
  let encryptSecretCommand: EncryptSecretCommand
  let logStub: sinon.SinonStub
  let logToStderrStub: sinon.SinonStub
  let logVerboseStub: sinon.SinonStub
  let requestAPIStub: sinon.SinonStub
  let workDir: string
  let keyPath: string

  beforeEach(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    encryptSecretCommand = new EncryptSecretCommand([], {} as any)
    logStub = sinon.stub(encryptSecretCommand, 'log')
    logToStderrStub = sinon.stub(encryptSecretCommand, 'logToStderr')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    logVerboseStub = sinon.stub(encryptSecretCommand as any, 'logVerbose')
    requestAPIStub = sinon.stub(request, 'requestAPI')
    workDir = await fs.mkdtemp(join(tmpdir(), 'zcli-encrypt-secret-cmd-'))
    keyPath = join(workDir, 'public-key.pem')
  })

  afterEach(async () => {
    sinon.restore()
    if (stdinDescriptor) {
      Object.defineProperty(process, 'stdin', stdinDescriptor)
    }
    await fs.rm(workDir, { recursive: true, force: true })
  })

  function stubParse (flags: Record<string, unknown>) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sinon.stub(encryptSecretCommand, 'parse' as any).resolves({ flags })
  }

  function changeFlags (flags: Record<string, unknown>) {
    // parse is already stubbed by an enclosing beforeEach; update its behavior
    (encryptSecretCommand as unknown as { parse: sinon.SinonStub }).parse.resolves({ flags })
  }

  function feedStdin (input: string): void {
    const stream = new PassThrough()
    stream.end(input)
    Object.defineProperty(process, 'stdin', { value: stream, configurable: true })
  }

  describe('command flags', () => {
    it('should have help flag', () => {
      expect(EncryptSecretCommand.flags.help).to.not.equal(undefined)
    })

    it('should have an optional key flag with char k', () => {
      expect(EncryptSecretCommand.flags.key).to.not.equal(undefined)
      expect(EncryptSecretCommand.flags.key.char).to.equal('k')
      expect(EncryptSecretCommand.flags.key.required).to.equal(false)
    })

    it('should have verbose flag with char v', () => {
      expect(EncryptSecretCommand.flags.verbose).to.not.equal(undefined)
      expect(EncryptSecretCommand.flags.verbose.char).to.equal('v')
      expect(EncryptSecretCommand.flags.verbose.type).to.equal('boolean')
      expect(EncryptSecretCommand.flags.verbose.default).to.equal(false)
    })
  })

  describe('with the fetched active key (default)', () => {
    beforeEach(() => {
      stubParse({ key: undefined, verbose: false, help: false })
      requestAPIStub.resolves({ status: 200, data: { public_key: rsaPublicKeyPem } })
      feedStdin('super-secret\n')
    })

    it('should display the Early Access warning on stderr', async () => {
      await encryptSecretCommand.run()

      expect(logToStderrStub.calledWith(sinon.match(/EARLY ACCESS FEATURE/))).to.equal(true)
    })

    it('should call the encryption-key endpoint once with GET and no body', async () => {
      await encryptSecretCommand.run()

      expect(requestAPIStub.calledOnce).to.equal(true)
      expect(requestAPIStub.calledWithExactly('/flowstate/connectors/public/encryption-key', {
        method: 'GET'
      })).to.equal(true)
    })

    it('should print only the enc:v1: envelope to stdout', async () => {
      await encryptSecretCommand.run()

      expect(logStub.calledOnce).to.equal(true)
      const envelope = String(logStub.firstCall.args[0])
      expect(envelope).to.match(/^enc:v1:/)
      expect(envelope).to.not.contain('EARLY ACCESS')
      expect(envelope).to.not.contain('super-secret')
    })

    it('should produce an envelope that decrypts to the stdin secret', async () => {
      await encryptSecretCommand.run()

      const payload = await decryptEnvelope(String(logStub.firstCall.args[0]))
      expect(payload).to.deep.equal({ field: 'authentication.client_secret', value: 'super-secret' })
    })

    it('should never write the secret to stderr', async () => {
      await encryptSecretCommand.run()

      const stderrLogged = logToStderrStub.args.map(args => String(args[0])).join('\n')
      expect(stderrLogged).to.not.contain('super-secret')
    })
  })

  describe('with a local key file (--key)', () => {
    beforeEach(async () => {
      await fs.writeFile(keyPath, rsaPublicKeyPem)
      stubParse({ key: keyPath, verbose: false, help: false })
      feedStdin('super-secret\n')
    })

    it('should not call the encryption-key endpoint', async () => {
      await encryptSecretCommand.run()

      expect(requestAPIStub.notCalled).to.equal(true)
      expect(logStub.calledOnce).to.equal(true)
    })

    it('should produce an envelope that decrypts to the stdin secret', async () => {
      await encryptSecretCommand.run()

      const payload = await decryptEnvelope(String(logStub.firstCall.args[0]))
      expect(payload.value).to.equal('super-secret')
    })
  })

  describe('verbose mode', () => {
    it('should log safe verbose details to stderr without the secret', async () => {
      stubParse({ key: undefined, verbose: true, help: false })
      requestAPIStub.resolves({ status: 200, data: { public_key: rsaPublicKeyPem } })
      feedStdin('super-secret\n')

      await encryptSecretCommand.run()

      expect(logVerboseStub.calledWith(sinon.match(/Requesting the active public connector encryption key/))).to.equal(true)
      expect(logVerboseStub.calledWith(sinon.match(/Reading the client secret from stdin/))).to.equal(true)

      const verboseLogged = logVerboseStub.args.map(args => String(args[0])).join('\n')
      expect(verboseLogged).to.not.contain('super-secret')
      expect(verboseLogged).to.not.match(/authorization/i)
    })
  })

  describe('error handling', () => {
    let errorStub: sinon.SinonStub
    let caughtError: Error | undefined

    beforeEach(() => {
      stubParse({ key: undefined, verbose: false, help: false })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      errorStub = sinon.stub(encryptSecretCommand, 'error').callsFake((message: any, options: any) => {
        const err = new Error(String(message))
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(err as any).options = options
        throw err
      })
    })

    afterEach(() => {
      caughtError = undefined
    })

    async function runExpectingFailure (): Promise<void> {
      try {
        await encryptSecretCommand.run()
        expect.fail('Should have thrown an error')
      } catch (error) {
        caughtError = error as Error
      }
    }

    it('should exit non-zero with auth guidance on 401', async () => {
      requestAPIStub.resolves({ status: 401, data: { error: 'unauthorized' } })
      feedStdin('super-secret\n')

      await runExpectingFailure()

      expect(caughtError).to.not.equal(undefined)
      expect(errorStub.calledWith(sinon.match(/HTTP 401/), sinon.match({ exit: 1 }))).to.equal(true)
    })

    it('should exit non-zero with administrator guidance on 403', async () => {
      requestAPIStub.resolves({ status: 403, data: { error: 'forbidden' } })
      feedStdin('super-secret\n')

      await runExpectingFailure()

      expect(errorStub.calledWith(sinon.match(/HTTP 403/), sinon.match({ exit: 1 }))).to.equal(true)
    })

    it('should exit non-zero with availability guidance on 503', async () => {
      requestAPIStub.rejects(Object.assign(new Error('Request failed with status code 503'), { response: { status: 503 } }))
      feedStdin('super-secret\n')

      await runExpectingFailure()

      expect(errorStub.calledWith(sinon.match(/temporarily unavailable/), sinon.match({ exit: 1 }))).to.equal(true)
    })

    it('should exit non-zero on a malformed 200 response', async () => {
      requestAPIStub.resolves({ status: 200, data: { unexpected: 'shape' } })
      feedStdin('super-secret\n')

      await runExpectingFailure()

      expect(errorStub.calledWith(sinon.match(/invalid encryption-key response/), sinon.match({ exit: 1 }))).to.equal(true)
    })

    it('should exit non-zero on network failure without dumping the error object', async () => {
      requestAPIStub.rejects(new Error('ECONNREFUSED'))
      feedStdin('super-secret\n')

      await runExpectingFailure()

      expect(errorStub.calledWith(sinon.match(/ECONNREFUSED/), sinon.match({ exit: 1 }))).to.equal(true)
    })

    it('should exit non-zero when the secret is empty', async () => {
      requestAPIStub.resolves({ status: 200, data: { public_key: rsaPublicKeyPem } })
      feedStdin('')

      await runExpectingFailure()

      expect(errorStub.calledWith(sinon.match(/cannot be empty/), sinon.match({ exit: 1 }))).to.equal(true)
    })

    it('should exit non-zero when the secret exceeds the size limit', async () => {
      requestAPIStub.resolves({ status: 200, data: { public_key: rsaPublicKeyPem } })
      feedStdin('x'.repeat(4001))

      await runExpectingFailure()

      expect(errorStub.calledWith(sinon.match(/byte limit/), sinon.match({ exit: 1 }))).to.equal(true)
    })

    it('should exit non-zero when the --key file does not exist', async () => {
      changeFlags({ key: join(workDir, 'missing.pem'), verbose: false, help: false })
      feedStdin('super-secret\n')

      await runExpectingFailure()

      expect(errorStub.calledWith(sinon.match(/ENOENT|no such file/), sinon.match({ exit: 1 }))).to.equal(true)
      expect(requestAPIStub.notCalled).to.equal(true)
    })

    it('should exit non-zero when the --key file contains a private key', async () => {
      await fs.writeFile(keyPath, rsaPrivateKeyPem)
      changeFlags({ key: keyPath, verbose: false, help: false })
      feedStdin('super-secret\n')

      await runExpectingFailure()

      expect(errorStub.calledWith(sinon.match(/not a private key/), sinon.match({ exit: 1 }))).to.equal(true)
      const errorMessage = String(errorStub.firstCall.args[0])
      expect(errorMessage).to.not.contain('super-secret')
    })

    it('should exit non-zero when the --key file is not a valid PEM', async () => {
      await fs.writeFile(keyPath, 'not a pem\n')
      changeFlags({ key: keyPath, verbose: false, help: false })
      feedStdin('super-secret\n')

      await runExpectingFailure()

      expect(errorStub.calledWith(sinon.match(/not a valid PEM public key/), sinon.match({ exit: 1 }))).to.equal(true)
    })

    it('should not print anything to stdout on failure', async () => {
      requestAPIStub.resolves({ status: 401, data: { error: 'unauthorized' } })
      feedStdin('super-secret\n')

      await runExpectingFailure()

      expect(logStub.notCalled).to.equal(true)
    })
  })
})
