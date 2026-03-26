/* eslint-disable no-unused-expressions */

import { expect, use } from 'chai'
import * as sinon from 'sinon'
import sinonChai from 'sinon-chai'
import ListCommand from '../../src/commands/connectors/list'
import { request } from '@zendesk/zcli-core'

use(sinonChai)

describe('list command', () => {
  let listCommand: ListCommand
  let logStub: sinon.SinonStub
  let requestAPIStub: sinon.SinonStub
  let stderrWriteStub: sinon.SinonStub

  const mockConnectorData = [
    {
      connector_name: 'test-connector-1',
      connector_nice_id: 'nice-id-1',
      title: 'Test Connector 1',
      version: '1.0.0',
      description: 'A test connector',
      created_at: '2026-03-01T00:00:00Z',
      updated_at: '2026-03-15T00:00:00Z'
    },
    {
      connector_name: 'test-connector-2',
      connector_nice_id: 'nice-id-2',
      title: 'Test Connector 2',
      version: '2.1.0',
      description: null,
      created_at: '2026-03-10T00:00:00Z',
      updated_at: '2026-03-20T00:00:00Z'
    }
  ]

  beforeEach(() => {
    listCommand = new ListCommand([], {} as any)
    logStub = sinon.stub(listCommand, 'log')
    requestAPIStub = sinon.stub(request, 'requestAPI')
    stderrWriteStub = sinon.stub(process.stderr, 'write')
  })

  afterEach(() => {
    sinon.restore()
  })

  describe('command flags', () => {
    it('should have help flag', () => {
      expect(ListCommand.flags.help).to.exist
    })

    it('should have json flag', () => {
      expect(ListCommand.flags.json).to.exist
      expect(ListCommand.flags.json.type).to.equal('boolean')
      expect(ListCommand.flags.json.default).to.equal(false)
    })

    it('should have verbose flag with char v', () => {
      expect(ListCommand.flags.verbose).to.exist
      expect(ListCommand.flags.verbose.char).to.equal('v')
      expect(ListCommand.flags.verbose.type).to.equal('boolean')
      expect(ListCommand.flags.verbose.default).to.equal(false)
    })
  })

  describe('successful list operations', () => {
    beforeEach(() => {
      sinon.stub(listCommand, 'parse' as any).resolves({
        flags: {
          json: false,
          verbose: false,
          help: false
        }
      })
    })

    it('should successfully list connectors in table format', async () => {
      requestAPIStub.resolves({
        status: 200,
        data: { connectors: mockConnectorData }
      })

      await listCommand.run()

      expect(requestAPIStub).to.have.been.calledWith('/flowstate/connectors/private/list', {
        method: 'GET'
      })
      expect(logStub).to.have.been.calledWith(sinon.match(/Found 2 connector/))
    })

    it('should display empty list message when no connectors exist', async () => {
      requestAPIStub.resolves({
        status: 200,
        data: { connectors: [] }
      })

      await listCommand.run()

      expect(logStub).to.have.been.calledWith(sinon.match(/No connectors found/))
    })

    it('should handle connectors with null values gracefully', async () => {
      const connectorWithNulls = [{
        connector_name: 'test-connector',
        connector_nice_id: null,
        title: null,
        version: '1.0.0',
        description: null,
        created_at: '2026-03-01T00:00:00Z',
        updated_at: '2026-03-15T00:00:00Z'
      }]

      requestAPIStub.resolves({
        status: 200,
        data: { connectors: connectorWithNulls }
      })

      await listCommand.run()

      expect(requestAPIStub).to.have.been.called
      expect(logStub).to.have.been.calledWith(sinon.match(/Found 1 connector/))
    })
  })

  describe('JSON output mode', () => {
    beforeEach(() => {
      sinon.stub(listCommand, 'parse' as any).resolves({
        flags: {
          json: true,
          verbose: false,
          help: false
        }
      })
    })

    it('should output JSON format when --json flag is set', async () => {
      requestAPIStub.resolves({
        status: 200,
        data: { connectors: mockConnectorData }
      })

      await listCommand.run()

      expect(logStub).to.have.been.calledOnce
      const outputArg = logStub.firstCall.args[0]
      const parsedOutput = JSON.parse(outputArg)

      expect(parsedOutput).to.be.an('array')
      expect(parsedOutput).to.have.lengthOf(2)
      expect(parsedOutput[0]).to.have.property('connector_name', 'test-connector-1')
      expect(parsedOutput[1]).to.have.property('connector_name', 'test-connector-2')
    })

    it('should output empty JSON array when no connectors exist', async () => {
      requestAPIStub.resolves({
        status: 200,
        data: { connectors: [] }
      })

      await listCommand.run()

      expect(logStub).to.have.been.calledOnce
      const outputArg = logStub.firstCall.args[0]
      const parsedOutput = JSON.parse(outputArg)

      expect(parsedOutput).to.be.an('array')
      expect(parsedOutput).to.have.lengthOf(0)
    })

    it('should not output spinner in JSON mode', async () => {
      requestAPIStub.resolves({
        status: 200,
        data: { connectors: mockConnectorData }
      })

      await listCommand.run()

      // In JSON mode, no spinner-related logs should be on stdout
      expect(logStub).to.have.been.calledOnce
    })
  })

  describe('verbose mode', () => {
    beforeEach(() => {
      sinon.stub(listCommand, 'parse' as any).resolves({
        flags: {
          json: false,
          verbose: true,
          help: false
        }
      })
    })

    it('should log verbose messages to stdout in normal mode', async () => {
      requestAPIStub.resolves({
        status: 200,
        data: { connectors: mockConnectorData }
      })

      await listCommand.run()

      expect(logStub).to.have.been.calledWith(sinon.match(/Verbose mode enabled/))
      expect(logStub).to.have.been.calledWith(sinon.match(/API response status: 200/))
    })

    it('should log verbose messages to stderr in JSON mode', async () => {
      sinon.stub(listCommand, 'parse' as any).resolves({
        flags: {
          json: true,
          verbose: true,
          help: false
        }
      })

      requestAPIStub.resolves({
        status: 200,
        data: { connectors: mockConnectorData }
      })

      await listCommand.run()

      // Verbose logs should go to stderr, not stdout
      expect(stderrWriteStub).to.have.been.called
      expect(stderrWriteStub).to.have.been.calledWith(sinon.match(/Verbose mode enabled/))
      expect(stderrWriteStub).to.have.been.calledWith(sinon.match(/API response status: 200/))

      // Only JSON output should be on stdout
      expect(logStub).to.have.been.calledOnce
      const outputArg = logStub.firstCall.args[0]
      expect(() => JSON.parse(outputArg)).to.not.throw()
    })
  })

  describe('error handling - non-200 responses', () => {
    beforeEach(() => {
      sinon.stub(listCommand, 'parse' as any).resolves({
        flags: {
          json: false,
          verbose: false,
          help: false
        }
      })
    })

    it('should handle 403 Forbidden response', async () => {
      requestAPIStub.resolves({
        status: 403,
        data: { error: 'Forbidden' }
      })

      await listCommand.run()

      expect(logStub).to.have.been.calledWith(sinon.match(/API returned non-200 status: 403/))
    })

    it('should handle 500 Internal Server Error response', async () => {
      requestAPIStub.resolves({
        status: 500,
        data: { error: 'Internal Server Error' }
      })

      await listCommand.run()

      expect(logStub).to.have.been.calledWith(sinon.match(/API returned non-200 status: 500/))
    })

    it('should route non-200 errors to stderr in JSON mode', async () => {
      sinon.stub(listCommand, 'parse' as any).resolves({
        flags: {
          json: true,
          verbose: false,
          help: false
        }
      })

      requestAPIStub.resolves({
        status: 404,
        data: { error: 'Not Found' }
      })

      await listCommand.run()

      // Error should go to stderr in JSON mode
      expect(stderrWriteStub).to.have.been.calledWith(sinon.match(/API returned non-200 status: 404/))
      expect(logStub).to.not.have.been.called
    })
  })

  describe('error handling - API failures', () => {
    let errorStub: sinon.SinonStub
    let caughtError: Error | undefined

    beforeEach(() => {
      sinon.stub(listCommand, 'parse' as any).resolves({
        flags: {
          json: false,
          verbose: false,
          help: false
        }
      })

      errorStub = sinon.stub(listCommand, 'error').callsFake((message: any, options: any) => {
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
        await listCommand.run()
        expect.fail('Should have thrown an error')
      } catch (error) {
        caughtError = error as Error
      }

      expect(caughtError).to.exist
      expect(errorStub).to.have.been.calledWith(
        'Network request failed: ECONNREFUSED',
        sinon.match({ exit: 1 })
      )
    })

    it('should handle authentication errors', async () => {
      const authError = new Error('Authentication failed: Invalid credentials')
      requestAPIStub.rejects(authError)

      try {
        await listCommand.run()
        expect.fail('Should have thrown an error')
      } catch (error) {
        caughtError = error as Error
      }

      expect(caughtError).to.exist
      expect(errorStub).to.have.been.calledWith(
        sinon.match(/Authentication failed/),
        sinon.match({ exit: 1 })
      )
    })

    it('should log verbose error details when verbose flag is set', async () => {
      sinon.stub(listCommand, 'parse' as any).resolves({
        flags: {
          json: false,
          verbose: true,
          help: false
        }
      })

      const detailedError = new Error('Detailed error message')
      requestAPIStub.rejects(detailedError)

      try {
        await listCommand.run()
        expect.fail('Should have thrown an error')
      } catch (error) {
        caughtError = error as Error
      }

      expect(logStub).to.have.been.calledWith(sinon.match(/Error Details:/))
      expect(logStub).to.have.been.calledWith(sinon.match(/Detailed error message/))
    })

    it('should route verbose error details to stderr in JSON mode', async () => {
      sinon.stub(listCommand, 'parse' as any).resolves({
        flags: {
          json: true,
          verbose: true,
          help: false
        }
      })

      const detailedError = new Error('Error in JSON mode')
      requestAPIStub.rejects(detailedError)

      try {
        await listCommand.run()
        expect.fail('Should have thrown an error')
      } catch (error) {
        caughtError = error as Error
      }

      // Verbose error details should go to stderr
      expect(stderrWriteStub).to.have.been.calledWith(sinon.match(/Error Details:/))
      expect(stderrWriteStub).to.have.been.calledWith(sinon.match(/Error in JSON mode/))
    })
  })

  describe('API response edge cases', () => {
    beforeEach(() => {
      sinon.stub(listCommand, 'parse' as any).resolves({
        flags: {
          json: false,
          verbose: false,
          help: false
        }
      })
    })

    it('should handle null connectors array', async () => {
      requestAPIStub.resolves({
        status: 200,
        data: { connectors: null }
      })

      await listCommand.run()

      expect(logStub).to.have.been.calledWith(sinon.match(/No connectors found/))
    })

    it('should handle undefined connectors array', async () => {
      requestAPIStub.resolves({
        status: 200,
        data: {}
      })

      await listCommand.run()

      expect(logStub).to.have.been.calledWith(sinon.match(/No connectors found/))
    })

    it('should handle malformed response data', async () => {
      requestAPIStub.resolves({
        status: 200,
        data: 'not an object'
      })

      await listCommand.run()

      expect(logStub).to.have.been.calledWith(sinon.match(/No connectors found/))
    })
  })
})
