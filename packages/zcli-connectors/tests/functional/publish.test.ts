/* eslint-disable no-unused-expressions */

import { expect, use } from 'chai'
import * as sinon from 'sinon'
import sinonChai from 'sinon-chai'
import * as path from 'path'
import * as fs from 'fs'
import PublishCommand from '../../src/commands/connectors/publish'
import * as validations from '../../src/lib/validations'
import * as publishModule from '../../src/lib/publish/publish'

use(sinonChai)

describe('publish command', () => {
  let publishCommand: PublishCommand
  let logStub: sinon.SinonStub

  beforeEach(() => {
    publishCommand = new PublishCommand([], {} as any)
    logStub = sinon.stub(publishCommand, 'log')
  })

  afterEach(() => {
    sinon.restore()
  })

  describe('command flags', () => {
    it('should have help flag', () => {
      expect(PublishCommand.flags.help).to.exist
    })

    it('should have input flag with char i', () => {
      expect(PublishCommand.flags.input).to.exist
      expect(PublishCommand.flags.input.char).to.equal('i')
      expect(PublishCommand.flags.input.type).to.equal('option')
      expect(PublishCommand.flags.input.default).to.equal('.')
    })

    it('should have validationOnly flag', () => {
      expect(PublishCommand.flags.validationOnly).to.exist
      expect(PublishCommand.flags.validationOnly.type).to.equal('boolean')
      expect(PublishCommand.flags.validationOnly.default).to.equal(false)
    })

    it('should have verbose flag with char v', () => {
      expect(PublishCommand.flags.verbose).to.exist
      expect(PublishCommand.flags.verbose.char).to.equal('v')
      expect(PublishCommand.flags.verbose.type).to.equal('boolean')
      expect(PublishCommand.flags.verbose.default).to.equal(false)
    })
  })

  describe('Publish Flow', () => {
    let testPath: string
    let caughtError: Error | undefined

    beforeEach(() => {
      testPath = path.join(__dirname, '../../fixtures')

      sinon.stub(fs, 'existsSync').returns(true)
      sinon.stub(publishCommand, 'parse' as any).resolves({
        args: {},
        flags: {
          input: testPath,
          validationOnly: false,
          verbose: false,
          help: false
        }
      })
    })

    afterEach(() => {
      sinon.restore()
      caughtError = undefined
    })

    it('should handle validation check errors and exit with code 1', async () => {
      const validationError = new Error('Validation failed: invalid manifest')
      sinon.stub(validations, 'runValidationChecks').rejects(validationError)

      try {
        await publishCommand.run()
        expect.fail('Should have thrown an error')
      } catch (error) {
        caughtError = error as Error
        console.log('Error message:', caughtError?.message)
        console.log('Full error:', caughtError)
      }

      expect(caughtError).to.exist
      expect(caughtError?.message).to.include('Validation failed: invalid manifest')
    })

    it('should handle createConnector errors during publish', async () => {
      sinon.stub(validations, 'runValidationChecks').resolves()

      const createConnectorError = new Error('Failed to create connector: API request failed')
      sinon.stub(publishModule, 'createConnector').rejects(createConnectorError)

      try {
        await publishCommand.run()
        expect.fail('Should have thrown an error')
      } catch (error) {
        caughtError = error as Error
        console.log('CreateConnector error message:', caughtError?.message)
      }

      expect(caughtError).to.exist
      expect(caughtError?.message).to.include('Failed to create connector: API request failed')
    })

    it('should handle uploadConnectorPackage errors during publish', async () => {
      sinon.stub(validations, 'runValidationChecks').resolves()
      sinon.stub(publishModule, 'createConnector').resolves({
        uploadUrl: 'https://example.com/upload',
        connectorName: 'test-connector'
      })

      const uploadError = new Error('Failed to upload connector: S3 upload failed')
      sinon.stub(publishModule, 'uploadConnectorPackage').rejects(uploadError)

      try {
        await publishCommand.run()
        expect.fail('Should have thrown an error')
      } catch (error) {
        caughtError = error as Error
        console.log('UploadConnectorPackage error message:', caughtError?.message)
      }

      expect(caughtError).to.exist
      expect(caughtError?.message).to.include('Failed to upload connector: S3 upload failed')
    })

    it('should successfully publish connector without errors', async () => {
      sinon.stub(validations, 'runValidationChecks').resolves()
      sinon.stub(publishModule, 'createConnector').resolves(
        {
          uploadUrl: 'https://example.com/upload',
          connectorName: 'test-connector'
        }
      )
      sinon.stub(publishModule, 'uploadConnectorPackage').resolves()

      try {
        await publishCommand.run()
        console.log('Publish succeeded without errors')
      } catch (error) {
        caughtError = error as Error
        console.log('Unexpected error:', caughtError?.message)
      }

      expect(caughtError).to.not.exist
      expect(logStub).to.have.been.calledWith(sinon.match(/Connector published successfully/))
    })
  })

  describe('Validation-only Flow', () => {
    let testPath: string
    let caughtError: Error | undefined

    beforeEach(() => {
      testPath = path.join(__dirname, '../../testdata', 'dist')
      sinon.stub(fs, 'existsSync').returns(true)
      sinon.stub(validations, 'runValidationChecks').resolves()
      sinon.stub(publishCommand, 'parse' as any).resolves({
        args: {},
        flags: {
          input: testPath,
          validationOnly: true,
          verbose: false,
          help: false
        }
      })
    })

    it('should successfully validate connector without errors', async () => {
      try {
        const createConnectorStub = sinon.stub(publishModule, 'createConnector')

        await publishCommand.run()

        expect(createConnectorStub).to.not.have.been.called
      } catch (error) {
        caughtError = error as Error
      }

      expect(caughtError).to.not.exist
      expect(logStub).to.have.been.calledWith(sinon.match(/Connector validation completed successfully/))
    })
  })
})
