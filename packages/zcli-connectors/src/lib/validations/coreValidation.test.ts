import { expect } from 'chai'
import * as sinon from 'sinon'
import * as fs from 'fs'
import { validateCore } from './coreValidation'
import type { ValidationContext } from './index'

describe('validateCore', () => {
  let existsSyncStub: sinon.SinonStub
  let logSpy: sinon.SinonSpy

  beforeEach(() => {
    existsSyncStub = sinon.stub(fs, 'existsSync')
    logSpy = sinon.spy()
  })

  afterEach(() => {
    sinon.restore()
  })

  describe('successful validation', () => {
    it('should pass validation when both manifest.json and connector.js exist', async () => {
      existsSyncStub.returns(true)

      const context: ValidationContext = {
        inputPath: '/path/to/dist',
        options: { verbose: false },
        log: logSpy
      }

      await validateCore(context)

      expect(logSpy.called).to.equal(false)
    })

    it('should log success messages when verbose mode is enabled and files exist', async () => {
      existsSyncStub.returns(true)

      const context: ValidationContext = {
        inputPath: '/path/to/dist',
        options: { verbose: true },
        log: logSpy
      }

      await validateCore(context)

      expect(logSpy.callCount).to.equal(3)
      expect(logSpy.getCall(0).args[0]).to.include('Running core structure validation')
      expect(logSpy.getCall(1).args[0]).to.include('Required files found')
      expect(logSpy.getCall(2).args[0]).to.include('Directory structure is valid')
    })
  })

  describe('validation failures', () => {
    it('should throw error when manifest.json is missing', async () => {
      existsSyncStub.withArgs(sinon.match(/manifest.json/)).returns(false)
      existsSyncStub.withArgs(sinon.match(/connector.js/)).returns(true)

      const context: ValidationContext = {
        inputPath: '/path/to/dist',
        options: { verbose: false },
        log: logSpy
      }

      try {
        await validateCore(context)
        expect.fail('Should have thrown an error')
      } catch (error) {
        expect((error as Error).message).to.include('Core validation failed')
        expect((error as Error).message).to.include('manifest.json')
      }
    })

    it('should throw error when connector.js is missing', async () => {
      existsSyncStub.withArgs(sinon.match(/manifest.json/)).returns(true)
      existsSyncStub.withArgs(sinon.match(/connector.js/)).returns(false)

      const context: ValidationContext = {
        inputPath: '/path/to/dist',
        options: { verbose: false },
        log: logSpy
      }

      try {
        await validateCore(context)
        expect.fail('Should have thrown an error')
      } catch (error) {
        expect((error as Error).message).to.include('Core validation failed')
        expect((error as Error).message).to.include('connector.js')
      }
    })

    it('should list all missing files in error message', async () => {
      existsSyncStub.returns(false)

      const context: ValidationContext = {
        inputPath: '/path/to/dist',
        options: { verbose: false },
        log: logSpy
      }

      try {
        await validateCore(context)
        expect.fail('Should have thrown an error')
      } catch (error) {
        expect((error as Error).message).to.include('manifest.json')
        expect((error as Error).message).to.include('connector.js')
      }
    })

    it('should suggest re-running bundle command when files are missing', async () => {
      existsSyncStub.returns(false)

      const context: ValidationContext = {
        inputPath: '/path/to/dist',
        options: { verbose: false },
        log: logSpy
      }

      try {
        await validateCore(context)
        expect.fail('Should have thrown an error')
      } catch (error) {
        expect((error as Error).message).to.include('Please re-run the bundle command')
      }
    })
  })

  describe('verbose logging', () => {
    it('should not log messages when verbose is false', async () => {
      existsSyncStub.returns(true)

      const context: ValidationContext = {
        inputPath: '/path/to/dist',
        options: { verbose: false },
        log: logSpy
      }

      await validateCore(context)

      expect(logSpy.called).to.equal(false)
    })

    it('should log startup message for verbose mode', async () => {
      existsSyncStub.returns(true)

      const context: ValidationContext = {
        inputPath: '/path/to/dist',
        options: { verbose: true },
        log: logSpy
      }

      await validateCore(context)

      expect(logSpy.getCall(0).args[0]).to.include('Running core structure validation')
    })
  })
})
