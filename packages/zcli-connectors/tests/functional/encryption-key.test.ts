/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-unused-expressions */

import { expect } from 'chai'
import { generateKeyPairSync } from 'crypto'
import { promises as fs } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import * as sinon from 'sinon'
import EncryptionKeyCommand from '../../src/commands/connectors/encryption-key'
import { request } from '@zendesk/zcli-core'

const rsaPublicKeyPem = generateKeyPairSync('rsa', { modulusLength: 2048 })
  .publicKey.export({ type: 'spki', format: 'pem' }).toString()

describe('encryption-key command', () => {
  let encryptionKeyCommand: EncryptionKeyCommand
  let logStub: sinon.SinonStub
  let logVerboseStub: sinon.SinonStub
  let requestAPIStub: sinon.SinonStub
  let workDir: string
  let outputPath: string

  beforeEach(async () => {
    encryptionKeyCommand = new EncryptionKeyCommand([], {} as any)
    logStub = sinon.stub(encryptionKeyCommand, 'log')
    logVerboseStub = sinon.stub(encryptionKeyCommand as any, 'logVerbose')
    requestAPIStub = sinon.stub(request, 'requestAPI')
    workDir = await fs.mkdtemp(join(tmpdir(), 'zcli-encryption-key-cmd-'))
    outputPath = join(workDir, 'public-key.pem')
  })

  afterEach(async () => {
    sinon.restore()
    await fs.rm(workDir, { recursive: true, force: true })
  })

  function stubParse (flags: Record<string, unknown>) {
    sinon.stub(encryptionKeyCommand, 'parse' as any).resolves({ flags })
  }

  describe('command flags', () => {
    it('should have help flag', () => {
      expect(EncryptionKeyCommand.flags.help).to.exist
    })

    it('should have a required output flag with char o', () => {
      expect(EncryptionKeyCommand.flags.output).to.exist
      expect(EncryptionKeyCommand.flags.output.char).to.equal('o')
      expect(EncryptionKeyCommand.flags.output.required).to.equal(true)
    })

    it('should have verbose flag with char v', () => {
      expect(EncryptionKeyCommand.flags.verbose).to.exist
      expect(EncryptionKeyCommand.flags.verbose.char).to.equal('v')
      expect(EncryptionKeyCommand.flags.verbose.type).to.equal('boolean')
      expect(EncryptionKeyCommand.flags.verbose.default).to.equal(false)
    })
  })

  describe('successful download', () => {
    beforeEach(() => {
      stubParse({ output: outputPath, verbose: false, help: false })
      requestAPIStub.resolves({ status: 200, data: { public_key: rsaPublicKeyPem } })
    })

    it('should display the Early Access warning', async () => {
      await encryptionKeyCommand.run()

      expect(logStub.calledWith(sinon.match(/EARLY ACCESS FEATURE/))).to.equal(true)
    })

    it('should call the encryption-key endpoint once with GET and no body', async () => {
      await encryptionKeyCommand.run()

      expect(requestAPIStub.calledOnce).to.equal(true)
      expect(requestAPIStub.calledWithExactly('/flowstate/connectors/public/encryption-key', {
        method: 'GET'
      })).to.equal(true)
    })

    it('should write the PEM to the output file and report the destination', async () => {
      await encryptionKeyCommand.run()

      const written = await fs.readFile(outputPath, 'utf-8')
      expect(written).to.contain('BEGIN PUBLIC KEY')
      expect(logStub.calledWith(sinon.match(`Public connector encryption key written to ${outputPath}`))).to.equal(true)
    })

    it('should not print PEM content to stdout', async () => {
      await encryptionKeyCommand.run()

      const logged = logStub.args.map(args => String(args[0])).join('\n')
      expect(logged).to.not.contain('BEGIN PUBLIC KEY')
    })
  })

  describe('verbose mode', () => {
    it('should log safe verbose details without PEM content', async () => {
      stubParse({ output: outputPath, verbose: true, help: false })
      requestAPIStub.resolves({ status: 200, data: { public_key: rsaPublicKeyPem } })

      await encryptionKeyCommand.run()

      expect(logVerboseStub.calledWith(sinon.match(/Verbose mode enabled/))).to.equal(true)
      expect(logVerboseStub.calledWith(sinon.match(/Destination:/))).to.equal(true)

      const verboseLogged = logVerboseStub.args.map(args => String(args[0])).join('\n')
      expect(verboseLogged).to.not.contain('BEGIN PUBLIC KEY')
      expect(verboseLogged).to.not.match(/authorization/i)
    })
  })

  describe('error handling', () => {
    let errorStub: sinon.SinonStub
    let caughtError: Error | undefined

    beforeEach(() => {
      stubParse({ output: outputPath, verbose: false, help: false })
      errorStub = sinon.stub(encryptionKeyCommand, 'error').callsFake((message: any, options: any) => {
        const err = new Error(String(message))
        ;(err as any).options = options
        throw err
      })
    })

    afterEach(() => {
      caughtError = undefined
    })

    async function runExpectingFailure (): Promise<void> {
      try {
        await encryptionKeyCommand.run()
        expect.fail('Should have thrown an error')
      } catch (error) {
        caughtError = error as Error
      }
    }

    it('should exit non-zero with auth guidance on 401', async () => {
      requestAPIStub.resolves({ status: 401, data: { error: 'unauthorized' } })

      await runExpectingFailure()

      expect(caughtError).to.exist
      expect(errorStub.calledWith(sinon.match(/HTTP 401/), sinon.match({ exit: 1 }))).to.equal(true)
      expect(await fileExists(outputPath)).to.equal(false)
    })

    it('should exit non-zero with administrator guidance on 403', async () => {
      requestAPIStub.resolves({ status: 403, data: { error: 'forbidden' } })

      await runExpectingFailure()

      expect(errorStub.calledWith(sinon.match(/HTTP 403/), sinon.match({ exit: 1 }))).to.equal(true)
    })

    it('should exit non-zero with availability guidance on 503 and not create a file', async () => {
      requestAPIStub.rejects(Object.assign(new Error('Request failed with status code 503'), { response: { status: 503 } }))

      await runExpectingFailure()

      expect(errorStub.calledWith(sinon.match(/temporarily unavailable/), sinon.match({ exit: 1 }))).to.equal(true)
      expect(await fileExists(outputPath)).to.equal(false)
    })

    it('should exit non-zero on a malformed 200 response and not create a file', async () => {
      requestAPIStub.resolves({ status: 200, data: { unexpected: 'shape' } })

      await runExpectingFailure()

      expect(errorStub.calledWith(sinon.match(/invalid encryption-key response/), sinon.match({ exit: 1 }))).to.equal(true)
      expect(await fileExists(outputPath)).to.equal(false)
    })

    it('should exit non-zero on network failure without dumping the error object', async () => {
      requestAPIStub.rejects(new Error('ECONNREFUSED'))

      await runExpectingFailure()

      expect(errorStub.calledWith(sinon.match(/ECONNREFUSED/), sinon.match({ exit: 1 }))).to.equal(true)
    })
  })
})

async function fileExists (path: string): Promise<boolean> {
  try {
    await fs.access(path)
    return true
  } catch {
    return false
  }
}
