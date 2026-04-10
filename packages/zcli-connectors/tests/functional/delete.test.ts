/* eslint-disable no-unused-expressions */

import { expect } from 'chai'
import * as sinon from 'sinon'
import DeleteCommand from '../../src/commands/connectors/delete'
import { request } from '@zendesk/zcli-core'

// Import the underlying deps to stub the prompt function
import * as deps from '@oclif/core/lib/cli-ux/deps'

describe('delete command', () => {
  let deleteCommand: DeleteCommand
  let logStub: sinon.SinonStub
  let requestAPIStub: sinon.SinonStub
  let parseStub: sinon.SinonStub
  let promptStub: sinon.SinonStub

  beforeEach(() => {
    // Restore any existing stubs first
    sinon.restore()

    // Create fresh stubs
    deleteCommand = new DeleteCommand([], {} as any)
    logStub = sinon.stub(deleteCommand, 'log')
    requestAPIStub = sinon.stub(request, 'requestAPI')
    // Stub the underlying prompt function that CliUx.ux.prompt getter returns
    promptStub = sinon.stub(deps.default.prompt, 'prompt')
  })

  afterEach(() => {
    sinon.restore()
  })

  describe('command flags', () => {
    it('should have help flag', () => {
      expect(DeleteCommand.flags.help).to.exist
    })

    it('should have verbose flag with char v', () => {
      expect(DeleteCommand.flags.verbose).to.exist
      expect(DeleteCommand.flags.verbose.char).to.equal('v')
      expect(DeleteCommand.flags.verbose.type).to.equal('boolean')
      expect(DeleteCommand.flags.verbose.default).to.equal(false)
    })

    it('should have force flag with char f', () => {
      expect(DeleteCommand.flags.force).to.exist
      expect(DeleteCommand.flags.force.char).to.equal('f')
      expect(DeleteCommand.flags.force.type).to.equal('boolean')
      expect(DeleteCommand.flags.force.default).to.equal(false)
    })
  })

  describe('command arguments', () => {
    it('should have connector argument', () => {
      expect(DeleteCommand.args).to.exist
      expect(DeleteCommand.args).to.have.lengthOf(1)
      expect(DeleteCommand.args[0].name).to.equal('connector')
      expect(DeleteCommand.args[0].required).to.equal(false)
    })
  })

  describe('successful delete operations', () => {
    beforeEach(() => {
      parseStub = sinon.stub(deleteCommand, 'parse' as any).resolves({
        args: { connector: 'test-connector' },
        flags: {
          verbose: false,
          force: true,
          help: false
        }
      })
    })

    it('should successfully delete a connector with status 200', async () => {
      requestAPIStub.resolves({
        status: 200,
        data: { message: 'Connector deleted' }
      })

      await deleteCommand.run()

      sinon.assert.calledWith(
        requestAPIStub,
        '/flowstate/connectors/private/test-connector',
        { method: 'DELETE' }
      )
      sinon.assert.calledWith(logStub, sinon.match(/Connector 'test-connector' deleted successfully/))
    })

    it('should successfully delete a connector with status 204', async () => {
      requestAPIStub.resolves({
        status: 204,
        data: null
      })

      await deleteCommand.run()

      sinon.assert.calledWith(
        requestAPIStub,
        '/flowstate/connectors/private/test-connector',
        { method: 'DELETE' }
      )
      sinon.assert.calledWith(logStub, sinon.match(/Connector 'test-connector' deleted successfully/))
    })

    it('should URL-encode connector names with special characters', async () => {
      parseStub.restore()
      parseStub = sinon.stub(deleteCommand, 'parse' as any).resolves({
        args: { connector: 'test connector/with-chars' },
        flags: {
          verbose: false,
          force: true,
          help: false
        }
      })

      requestAPIStub.resolves({
        status: 200,
        data: {}
      })

      await deleteCommand.run()

      sinon.assert.calledWith(
        requestAPIStub,
        '/flowstate/connectors/private/test%20connector%2Fwith-chars',
        { method: 'DELETE' }
      )
    })
  })

  describe('confirmation prompt', () => {
    beforeEach(() => {
      parseStub = sinon.stub(deleteCommand, 'parse' as any).resolves({
        args: { connector: 'test-connector' },
        flags: {
          verbose: false,
          force: false,
          help: false
        }
      })
    })

    it('should require confirmation when force flag is not set', async () => {
      promptStub.resolves('test-connector')
      requestAPIStub.resolves({
        status: 200,
        data: {}
      })

      await deleteCommand.run()

      sinon.assert.calledWith(
        promptStub,
        sinon.match(/Are you sure you want to delete connector 'test-connector'/)
      )
      sinon.assert.called(requestAPIStub)
    })

    it('should cancel deletion if confirmation does not match', async () => {
      promptStub.onFirstCall().resolves('wrong-name')

      await deleteCommand.run()

      sinon.assert.called(promptStub)
      sinon.assert.calledWith(logStub, sinon.match(/Deletion cancelled/))
      sinon.assert.notCalled(requestAPIStub)
    })

    it('should skip confirmation with --force flag', async () => {
      parseStub.restore()
      parseStub = sinon.stub(deleteCommand, 'parse' as any).resolves({
        args: { connector: 'test-connector' },
        flags: {
          verbose: false,
          force: true,
          help: false
        }
      })

      requestAPIStub.resolves({
        status: 200,
        data: {}
      })

      await deleteCommand.run()

      sinon.assert.notCalled(promptStub)
      sinon.assert.called(requestAPIStub)
    })
  })

  describe('connector name prompting', () => {
    beforeEach(() => {
      parseStub = sinon.stub(deleteCommand, 'parse' as any).resolves({
        args: { connector: undefined },
        flags: {
          verbose: false,
          force: true,
          help: false
        }
      })
    })

    it('should prompt for connector name if not provided', async () => {
      promptStub.onFirstCall().resolves('prompted-connector')
      promptStub.onSecondCall().resolves('prompted-connector')
      requestAPIStub.resolves({
        status: 200,
        data: {}
      })

      await deleteCommand.run()

      sinon.assert.calledWith(promptStub, 'Connector name')
      sinon.assert.calledWith(
        requestAPIStub,
        '/flowstate/connectors/private/prompted-connector',
        { method: 'DELETE' }
      )
    })

    it('should trim whitespace from connector name', async () => {
      parseStub.restore()
      parseStub = sinon.stub(deleteCommand, 'parse' as any).resolves({
        args: { connector: '  test-connector  ' },
        flags: {
          verbose: false,
          force: true,
          help: false
        }
      })

      requestAPIStub.resolves({
        status: 200,
        data: {}
      })

      await deleteCommand.run()

      sinon.assert.calledWith(
        requestAPIStub,
        '/flowstate/connectors/private/test-connector',
        { method: 'DELETE' }
      )
    })

    it('should error if connector name is empty after trimming', async () => {
      parseStub.restore()
      parseStub = sinon.stub(deleteCommand, 'parse' as any).resolves({
        args: { connector: '   ' },
        flags: {
          verbose: false,
          force: true,
          help: false
        }
      })

      const errorStub = sinon.stub(deleteCommand, 'error').callsFake((message: any) => {
        throw new Error(String(message))
      })

      try {
        await deleteCommand.run()
        expect.fail('Should have thrown an error')
      } catch (error) {
        // Expected
      }

      sinon.assert.calledWith(
        errorStub,
        'Connector name cannot be empty',
        sinon.match({ exit: 1 })
      )
    })
  })

  describe('verbose mode', () => {
    beforeEach(() => {
      parseStub = sinon.stub(deleteCommand, 'parse' as any).resolves({
        args: { connector: 'test-connector' },
        flags: {
          verbose: true,
          force: true,
          help: false
        }
      })
    })

    it('should log verbose messages to stdout in normal mode', async () => {
      requestAPIStub.resolves({
        status: 200,
        data: { message: 'Deleted' }
      })

      await deleteCommand.run()

      sinon.assert.calledWith(logStub, sinon.match(/Verbose mode enabled/))
      sinon.assert.calledWith(logStub, sinon.match(/Connector name: test-connector/))
      sinon.assert.calledWith(logStub, sinon.match(/API response status: 200/))
    })
  })

  describe('error handling - non-2xx responses', () => {
    let errorStub: sinon.SinonStub

    beforeEach(() => {
      parseStub = sinon.stub(deleteCommand, 'parse' as any).resolves({
        args: { connector: 'test-connector' },
        flags: {
          verbose: false,
          force: true,
          help: false
        }
      })

      errorStub = sinon.stub(deleteCommand, 'error').callsFake((message: any) => {
        throw new Error(String(message))
      })
    })

    it('should handle 404 Not Found response', async () => {
      requestAPIStub.resolves({
        status: 404,
        data: { error: 'Not Found' }
      })

      try {
        await deleteCommand.run()
        expect.fail('Should have thrown an error')
      } catch (error) {
        // Expected
      }

      sinon.assert.calledWith(
        errorStub,
        sinon.match(/Failed to delete connector: HTTP 404/),
        sinon.match({ exit: 1 })
      )
    })

    it('should handle 403 Forbidden response', async () => {
      requestAPIStub.resolves({
        status: 403,
        data: { error: 'Forbidden' }
      })

      try {
        await deleteCommand.run()
        expect.fail('Should have thrown an error')
      } catch (error) {
        // Expected
      }

      sinon.assert.calledWith(
        errorStub,
        sinon.match(/Failed to delete connector: HTTP 403/),
        sinon.match({ exit: 1 })
      )
    })

    it('should handle 500 Internal Server Error response', async () => {
      requestAPIStub.resolves({
        status: 500,
        data: { error: 'Internal Server Error' }
      })

      try {
        await deleteCommand.run()
        expect.fail('Should have thrown an error')
      } catch (error) {
        // Expected
      }

      sinon.assert.calledWith(
        errorStub,
        sinon.match(/Failed to delete connector/),
        sinon.match({ exit: 1 })
      )
    })

    it('should handle error responses with message field', async () => {
      requestAPIStub.resolves({
        status: 400,
        data: { message: 'Invalid connector name format' }
      })

      try {
        await deleteCommand.run()
        expect.fail('Should have thrown an error')
      } catch (error) {
        // Expected
      }

      sinon.assert.calledWith(
        errorStub,
        sinon.match(/Failed to delete connector: HTTP 400 - Invalid connector name format/),
        sinon.match({ exit: 1 })
      )
    })
  })

  describe('error handling - API failures', () => {
    let errorStub: sinon.SinonStub
    let caughtError: Error | undefined

    beforeEach(() => {
      parseStub = sinon.stub(deleteCommand, 'parse' as any).resolves({
        args: { connector: 'test-connector' },
        flags: {
          verbose: false,
          force: true,
          help: false
        }
      })

      errorStub = sinon.stub(deleteCommand, 'error').callsFake((message: any, options: any) => {
        const err = new Error(String(message))
        ;(err as any).options = options
        throw err
      })
    })

    afterEach(() => {
      caughtError = undefined
    })

    it('should handle network errors', async () => {
      const networkError = new Error('Network request failed: ECONNREFUSED')
      requestAPIStub.rejects(networkError)

      try {
        await deleteCommand.run()
        expect.fail('Should have thrown an error')
      } catch (error) {
        caughtError = error as Error
      }

      expect(caughtError).to.exist
      sinon.assert.calledWith(
        errorStub,
        'Network request failed: ECONNREFUSED',
        sinon.match({ exit: 1 })
      )
    })

    it('should handle authentication errors', async () => {
      const authError = new Error('Authentication failed: Invalid credentials')
      requestAPIStub.rejects(authError)

      try {
        await deleteCommand.run()
        expect.fail('Should have thrown an error')
      } catch (error) {
        caughtError = error as Error
      }

      expect(caughtError).to.exist
      sinon.assert.calledWith(
        errorStub,
        sinon.match(/Authentication failed/),
        sinon.match({ exit: 1 })
      )
    })

    it('should log verbose error details when verbose flag is set', async () => {
      parseStub.restore()
      parseStub = sinon.stub(deleteCommand, 'parse' as any).resolves({
        args: { connector: 'test-connector' },
        flags: {
          verbose: true,
          force: true,
          help: false
        }
      })

      const detailedError = new Error('Detailed error message')
      requestAPIStub.rejects(detailedError)

      try {
        await deleteCommand.run()
        expect.fail('Should have thrown an error')
      } catch (error) {
        caughtError = error as Error
      }

      sinon.assert.calledWith(logStub, sinon.match(/Error Details:/))
      sinon.assert.calledWith(logStub, sinon.match(/Detailed error message/))
    })
  })
})
