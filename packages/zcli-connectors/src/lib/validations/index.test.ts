import { expect } from 'chai'
import * as sinon from 'sinon'
import { runValidationChecks } from './index'
import * as coreValidationModule from './coreValidation'
import * as manifestValidationModule from './manifestValidation'
import * as assetsValidationModule from './assetsValidation'

describe('runValidationChecks', () => {
  let validateCoreStub: sinon.SinonStub
  let validateAssetsStub: sinon.SinonStub
  let validateManifestStub: sinon.SinonStub
  let logSpy: sinon.SinonSpy

  beforeEach(() => {
    validateCoreStub = sinon.stub(coreValidationModule, 'validateCore').returns()
    validateAssetsStub = sinon.stub(assetsValidationModule, 'validateAssets').returns()
    validateManifestStub = sinon.stub(manifestValidationModule, 'validateManifest').returns()
    logSpy = sinon.spy()
  })

  afterEach(() => {
    sinon.restore()
  })

  describe('validation function execution order', () => {
    it('should call all three validation functions in the correct order', async () => {
      const callOrder: string[] = []

      validateCoreStub.callsFake(() => {
        callOrder.push('validateCore')
      })

      validateAssetsStub.callsFake(() => {
        callOrder.push('validateAssets')
      })

      validateManifestStub.callsFake(() => {
        callOrder.push('validateManifest')
      })

      const result = await runValidationChecks('/test/path', { verbose: false }, logSpy)

      expect(callOrder).to.deep.equal(['validateCore', 'validateAssets', 'validateManifest'])
      expect(result).to.equal(true)
    })

    it('should call all three validation functions with correct context', async () => {
      const result = await runValidationChecks('/test/path', { verbose: false }, logSpy)

      expect(validateCoreStub.callCount).to.equal(1)
      expect(validateAssetsStub.callCount).to.equal(1)
      expect(validateManifestStub.callCount).to.equal(1)

      const expectedContext = {
        inputPath: '/test/path',
        options: { verbose: false },
        log: logSpy
      }

      expect(validateCoreStub.getCall(0).args[0]).to.deep.equal(expectedContext)
      expect(validateAssetsStub.getCall(0).args[0]).to.deep.equal(expectedContext)
      expect(validateManifestStub.getCall(0).args[0]).to.deep.equal(expectedContext)
      expect(result).to.equal(true)
    })
  })

  describe('verbose logging', () => {
    it('should log completion message when verbose mode is enabled', async () => {
      const result = await runValidationChecks('/test/path', { verbose: true }, logSpy)

      expect(logSpy.called).to.equal(true)
      expect(logSpy.lastCall.args[0]).to.include('All validation checks completed')
      expect(result).to.equal(true)
    })

    it('should not log completion message when verbose mode is disabled', async () => {
      const result = await runValidationChecks('/test/path', { verbose: false }, logSpy)

      expect(logSpy.called).to.equal(false)
      expect(result).to.equal(true)
    })
  })

  describe('error handling', () => {
    it('should throw error from validateCore', async () => {
      const testError = new Error('Core validation failed')
      validateCoreStub.throws(testError)

      try {
        await runValidationChecks('/test/path', { verbose: false }, logSpy)
        expect.fail('Should have thrown an error')
      } catch (error) {
        expect((error as Error).message).to.equal('Core validation failed')
      }
    })

    it('should throw error from validateAssets and not call validateManifest', async () => {
      const testError = new Error('Assets validation failed')
      validateAssetsStub.throws(testError)

      try {
        await runValidationChecks('/test/path', { verbose: false }, logSpy)
        expect.fail('Should have thrown an error')
      } catch (error) {
        expect((error as Error).message).to.equal('Assets validation failed')
        expect(validateManifestStub.called).to.equal(false)
      }
    })

    it('should throw error from validateManifest', async () => {
      const testError = new Error('Manifest validation failed')
      validateManifestStub.throws(testError)

      try {
        await runValidationChecks('/test/path', { verbose: false }, logSpy)
        expect.fail('Should have thrown an error')
      } catch (error) {
        expect((error as Error).message).to.equal('Manifest validation failed')
      }
    })
  })
})
