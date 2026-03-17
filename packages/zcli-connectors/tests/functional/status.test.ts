/* eslint-disable no-unused-expressions */

import { expect, use } from 'chai'
import * as sinon from 'sinon'
import sinonChai from 'sinon-chai'
import * as path from 'path'
import * as fs from 'fs'
import PublishStatusCommand from '../../src/commands/connectors/publish/status'
import * as statusModule from '../../src/lib/publish/status'
import type { ProvisioningStatus } from '../../src/lib/publish/poller'

use(sinonChai)

describe('publish:status', () => {
  let statusCommand: PublishStatusCommand
  let logStub: sinon.SinonStub
  let errorStub: sinon.SinonStub
  let fsStubs: {
    existsSync: sinon.SinonStub
    readFileSync: sinon.SinonStub
  }

  beforeEach(() => {
    statusCommand = new PublishStatusCommand([], {} as any)
    logStub = sinon.stub(statusCommand, 'log')
    errorStub = sinon.stub(statusCommand, 'error').callsFake((message: unknown) => {
      throw new Error(String(message))
    })

    fsStubs = {
      existsSync: sinon.stub(fs, 'existsSync'),
      readFileSync: sinon.stub(fs, 'readFileSync')
    }
  })

  afterEach(() => {
    sinon.restore()
  })

  describe('command configuration', () => {
    it('should have correct description', () => {
      expect(PublishStatusCommand.description).to.equal('check the provisioning status of a published connector')
    })

    it('should have help flag', () => {
      expect(PublishStatusCommand.flags.help).to.exist
    })

    it('should have path argument with correct default', () => {
      expect(PublishStatusCommand.args).to.have.length(1)
      expect(PublishStatusCommand.args[0].name).to.equal('path')
      expect(PublishStatusCommand.args[0].required).to.equal(false)
      expect(PublishStatusCommand.args[0].default).to.equal('.')
    })

    it('should have correct examples', () => {
      expect(PublishStatusCommand.examples).to.include.members([
        '<%= config.bin %> <%= command.id %>',
        '<%= config.bin %> <%= command.id %> ./example-connector'
      ])
    })
  })

  describe('status check flow', () => {
    beforeEach(() => {
      sinon.stub(statusCommand, 'parse' as any).resolves({
        args: { path: '.' }
      })
    })

    it('should successfully check status when manifest.json exists in dist directory', async () => {
      const mockManifest = { name: 'test-connector', version: '1.0.0' }
      const mockStatus = {
        id: '01KKWDA6BV6SGNQRFSMW5HEYSY',
        connectorName: 'test-connector',
        version: '1.0.0',
        status: 'SUCCESS' as ProvisioningStatus,
        reason: undefined
      }

      // Both dist directory and manifest.json should exist
      fsStubs.existsSync.returns(true)
      fsStubs.readFileSync.returns(JSON.stringify(mockManifest))
      sinon.stub(statusModule, 'getProvisioningStatus').resolves(mockStatus)

      await statusCommand.run()

      expect(logStub).to.have.been.calledWith(sinon.match(/Status: Provisioned/))
      expect(logStub).to.have.been.calledWith(sinon.match(/test-connector.*v1\.0\.0/))
    })

    it('should display different status types correctly', async () => {
      const mockManifest = { name: 'test-connector', version: '1.0.0' }

      fsStubs.existsSync.returns(true)
      fsStubs.readFileSync.returns(JSON.stringify(mockManifest))

      const pendingUploadStatus = {
        id: '01KKWDA6BV6SGNQRFSMW5HEYSY',
        connectorName: 'test-connector',
        version: '1.0.0',
        status: 'PENDING_UPLOAD' as ProvisioningStatus,
        reason: undefined
      }
      sinon.stub(statusModule, 'getProvisioningStatus').resolves(pendingUploadStatus)

      await statusCommand.run()

      expect(logStub).to.have.been.calledWith(sinon.match(/Status: Waiting for upload/))
    })

    it('should display failed status with reason', async () => {
      const mockManifest = { name: 'test-connector', version: '1.0.0' }

      fsStubs.existsSync.returns(true)
      fsStubs.readFileSync.returns(JSON.stringify(mockManifest))

      const failedStatus = {
        id: 'job-123',
        connectorName: 'test-connector',
        version: '1.0.0',
        status: 'FAILED' as ProvisioningStatus,
        reason: 'Invalid manifest schema'
      }
      sinon.stub(statusModule, 'getProvisioningStatus').resolves(failedStatus)

      await statusCommand.run()

      expect(logStub).to.have.been.calledWith(sinon.match(/Status: Failed/))
      expect(logStub).to.have.been.calledWith(sinon.match(/Invalid manifest schema/))
    })
  })

  describe('path handling', () => {
    it('should resolve relative paths correctly', async () => {
      const testPath = './my-connector'
      const resolvedPath = path.resolve(testPath)
      const distPath = path.join(resolvedPath, 'dist')
      const manifestPath = path.join(resolvedPath, 'dist', 'manifest.json')

      const mockManifest = { name: 'my-connector', version: '1.0.0' }

      sinon.stub(statusCommand, 'parse' as any).resolves({
        args: { path: testPath }
      })

      fsStubs.existsSync.callsFake((filePath: string) => {
        return filePath === distPath || filePath === manifestPath
      })
      fsStubs.readFileSync.withArgs(manifestPath, 'utf-8').returns(JSON.stringify(mockManifest))

      const mockStatus = {
        id: 'job-123',
        connectorName: 'my-connector',
        version: '1.0.0',
        status: 'SUCCESS' as ProvisioningStatus,
        reason: undefined
      }
      sinon.stub(statusModule, 'getProvisioningStatus').resolves(mockStatus)

      await statusCommand.run()

      expect(fsStubs.readFileSync).to.have.been.calledWith(manifestPath, 'utf-8')
    })

    it('should handle absolute paths correctly', async () => {
      const testPath = path.resolve('/', 'absolute', 'path', 'to', 'connector')
      const distPath = path.join(testPath, 'dist')
      const manifestPath = path.join(testPath, 'dist', 'manifest.json')

      const mockManifest = { name: 'abs-connector', version: '2.0.0' }

      sinon.stub(statusCommand, 'parse' as any).resolves({
        args: { path: testPath }
      })

      fsStubs.existsSync.callsFake((filePath: string) => {
        const normalizedFilePath = path.normalize(filePath)
        const normalizedDistPath = path.normalize(distPath)
        const normalizedManifestPath = path.normalize(manifestPath)
        return normalizedFilePath === normalizedDistPath || normalizedFilePath === normalizedManifestPath
      })
      fsStubs.readFileSync.withArgs(manifestPath, 'utf-8').returns(JSON.stringify(mockManifest))

      const mockStatus = {
        id: 'job-456',
        connectorName: 'abs-connector',
        version: '2.0.0',
        status: 'PENDING_VALIDATION' as ProvisioningStatus,
        reason: undefined
      }
      sinon.stub(statusModule, 'getProvisioningStatus').resolves(mockStatus)

      await statusCommand.run()

      expect(fsStubs.readFileSync).to.have.been.calledWith(manifestPath, 'utf-8')
    })
  })

  describe('error handling', () => {
    beforeEach(() => {
      sinon.stub(statusCommand, 'parse' as any).resolves({
        args: { path: '.' }
      })
    })

    it('should error when dist directory does not exist', async () => {
      fsStubs.existsSync.returns(false)

      try {
        await statusCommand.run()
        expect.fail('Expected statusCommand.run() to throw an error')
      } catch (error) {
        expect(errorStub).to.have.been.calledOnce
        expect(errorStub.firstCall.args[0]).to.match(/dist directory not found/)
        expect(errorStub.firstCall.args[1]).to.deep.equal({ exit: 1 })
      }
    })

    it('should error when manifest.json does not exist in dist directory', async () => {
      const connectorPath = path.resolve('.')
      const distPath = path.join(connectorPath, 'dist')
      const manifestPath = path.join(distPath, 'manifest.json')

      fsStubs.existsSync.callsFake((filePath: string) => {
        if (filePath === distPath) return true
        if (filePath === manifestPath) return false
        return false
      })

      try {
        await statusCommand.run()
        expect.fail('Expected statusCommand.run() to throw an error')
      } catch (error) {
        expect(errorStub).to.have.been.calledOnce
        expect(errorStub.firstCall.args[0]).to.match(/manifest\.json not found/)
        expect(errorStub.firstCall.args[1]).to.deep.equal({ exit: 1 })
      }
    })

    it('should error when manifest.json cannot be read', async () => {
      fsStubs.existsSync.returns(true)
      fsStubs.readFileSync.throws(new Error('Permission denied'))

      try {
        await statusCommand.run()
        expect.fail('Expected statusCommand.run() to throw an error')
      } catch (error) {
        expect(errorStub).to.have.been.calledOnce
        expect(errorStub.firstCall.args[0]).to.match(/Error reading manifest\.json.*Permission denied/)
        expect(errorStub.firstCall.args[1]).to.deep.equal({ exit: 1 })
      }
    })

    it('should error when manifest.json contains invalid JSON', async () => {
      fsStubs.existsSync.returns(true)
      fsStubs.readFileSync.returns('not valid json {{{')

      try {
        await statusCommand.run()
        expect.fail('Expected statusCommand.run() to throw an error')
      } catch (error) {
        expect(errorStub).to.have.been.calledOnce
        expect(errorStub.firstCall.args[0]).to.match(/Error reading manifest\.json/)
        expect(errorStub.firstCall.args[1]).to.deep.equal({ exit: 1 })
      }
    })

    it('should error when connector name is missing from manifest.json', async () => {
      const mockManifest = { version: '1.0.0' }
      fsStubs.existsSync.returns(true)
      fsStubs.readFileSync.returns(JSON.stringify(mockManifest))

      try {
        await statusCommand.run()
        expect.fail('Expected statusCommand.run() to throw an error')
      } catch (error) {
        expect(errorStub).to.have.been.calledOnce
        expect(errorStub.firstCall.args[0]).to.match(/Connector name not found in manifest\.json/)
        expect(errorStub.firstCall.args[1]).to.deep.equal({ exit: 1 })
      }
    })

    it('should error when getProvisioningStatus throws an Error', async () => {
      const mockManifest = { name: 'my-connector', version: '1.0.0' }
      fsStubs.existsSync.returns(true)
      fsStubs.readFileSync.returns(JSON.stringify(mockManifest))
      sinon.stub(statusModule, 'getProvisioningStatus').rejects(new Error('Network error'))

      try {
        await statusCommand.run()
        expect.fail('Expected statusCommand.run() to throw an error')
      } catch (error) {
        expect(errorStub).to.have.been.calledOnce
        expect(errorStub.firstCall.args[0]).to.equal('Network error')
        expect(errorStub.firstCall.args[1]).to.deep.equal({ exit: 1 })
      }
    })

    it('should error when getProvisioningStatus throws a non-Error value', async () => {
      const mockManifest = { name: 'my-connector', version: '1.0.0' }
      fsStubs.existsSync.returns(true)
      fsStubs.readFileSync.returns(JSON.stringify(mockManifest))
      sinon.stub(statusModule, 'getProvisioningStatus').rejects('unexpected string error')

      try {
        await statusCommand.run()
        expect.fail('Expected statusCommand.run() to throw an error')
      } catch (error) {
        expect(errorStub).to.have.been.calledOnce
        expect(errorStub.firstCall.args[1]).to.deep.equal({ exit: 1 })
      }
    })
  })
})
