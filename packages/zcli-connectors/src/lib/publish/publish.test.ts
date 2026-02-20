/* eslint-disable @typescript-eslint/no-explicit-any */

import { expect } from 'chai'
import * as sinon from 'sinon'
import * as fs from 'fs'
import { join } from 'path'
import * as publishModule from './publish'
import { createConnector, uploadConnectorPackage } from './publish'
import { request } from '@zendesk/zcli-core'

const testDataPath = join(__dirname, '../../../fixtures')

describe('publish', () => {
  describe('createPackageArchive', () => {
    let createWriteStreamStub: sinon.SinonStub

    afterEach(() => {
      sinon.restore()
    })

    it('should generate correct archive filename with connector name', () => {
      createWriteStreamStub = sinon.stub(fs, 'createWriteStream').returns({} as any)

      publishModule.createPackageArchive('/input/path', 'my-connector')

      expect(createWriteStreamStub.calledOnce).to.equal(true)
      const callArgs = createWriteStreamStub.getCall(0).args[0]
      expect(callArgs).to.equal(join('/input/path', 'my-connector.zip'))
    })

    it('should work with custom directories', () => {
      createWriteStreamStub = sinon.stub(fs, 'createWriteStream').returns({} as any)

      publishModule.createPackageArchive('/custom/long/input/path', 'connector')

      const callArgs = createWriteStreamStub.getCall(0).args[0]
      expect(callArgs).to.equal(join('/custom/long/input/path', 'connector.zip'))
    })
  })

  describe('createConnector', () => {
    let readFileSyncStub: sinon.SinonStub
    let requestAPIStub: sinon.SinonStub

    afterEach(() => {
      sinon.restore()
    })

    it('should successfully create connector and return upload URL and connector name', async () => {
      const manifestContent = JSON.stringify({
        name: 'my-connector',
        version: '1.0.0',
        title: 'My Connector'
      })

      readFileSyncStub = sinon.stub(fs, 'readFileSync').returns(manifestContent)
      requestAPIStub = sinon.stub(request, 'requestAPI').resolves({
        status: 201,
        data: {
          upload_url: 'https://example.com/upload/123'
        }
      } as any)

      const result = await createConnector('/input/path')

      expect(result.uploadUrl).to.equal('https://example.com/upload/123')
      expect(result.connectorName).to.equal('my-connector')
      expect(readFileSyncStub.calledOnce).to.equal(true)
      expect(requestAPIStub.calledOnce).to.equal(true)
    })

    it('should return connector name along with upload URL', async () => {
      const manifestContent = JSON.stringify({
        name: 'test-connector',
        version: '2.0.0'
      })

      readFileSyncStub = sinon.stub(fs, 'readFileSync').returns(manifestContent)
      requestAPIStub = sinon.stub(request, 'requestAPI').resolves({
        status: 201,
        data: {
          upload_url: 'https://example.com/upload/456'
        }
      } as any)

      const result = await createConnector('/input/path')

      expect(result.uploadUrl).to.equal('https://example.com/upload/456')
      expect(result.connectorName).to.equal('test-connector')

      const callArgs = requestAPIStub.getCall(0)
      expect(callArgs.args[0]).to.equal('/flowstate/connectors/private/create')
      expect(callArgs.args[1].method).to.equal('POST')
      expect(callArgs.args[1].data.connector_name).to.equal('test-connector')
      expect(callArgs.args[1].data.version).to.equal('2.0.0')
    })

    it('should throw error when connector name is missing', async () => {
      const manifestContent = JSON.stringify({
        version: '1.0.0'
      })

      readFileSyncStub = sinon.stub(fs, 'readFileSync').returns(manifestContent)

      try {
        await createConnector('/input/path')
        expect.fail('Should have thrown an error')
      } catch (error) {
        expect((error as Error).message).to.include('Connector name and version are required')
      }
    })

    it('should throw error when connector version is missing', async () => {
      const manifestContent = JSON.stringify({
        name: 'my-connector'
      })

      readFileSyncStub = sinon.stub(fs, 'readFileSync').returns(manifestContent)

      try {
        await createConnector('/input/path')
        expect.fail('Should have thrown an error')
      } catch (error) {
        expect((error as Error).message).to.include('Connector name and version are required')
      }
    })

    it('should throw error when API status is not 201', async () => {
      const manifestContent = JSON.stringify({
        name: 'my-connector',
        version: '1.0.0'
      })

      readFileSyncStub = sinon.stub(fs, 'readFileSync').returns(manifestContent)
      requestAPIStub = sinon.stub(request, 'requestAPI').resolves({
        status: 400,
        data: {
          error: 'Invalid connector'
        }
      } as any)

      try {
        await createConnector('/input/path')
        expect.fail('Should have thrown an error')
      } catch (error) {
        expect((error as Error).message).to.include('API returned status 400')
        expect((error as Error).message).to.include('Invalid connector')
      }
    })

    it('should throw error when manifest file is not found', async () => {
      readFileSyncStub = sinon.stub(fs, 'readFileSync').throws(new Error('File not found'))

      try {
        await createConnector('/input/path')
        expect.fail('Should have thrown an error')
      } catch (error) {
        expect((error as Error).message).to.include('File not found')
      }
    })

    it('should throw error when manifest JSON is invalid', async () => {
      readFileSyncStub = sinon.stub(fs, 'readFileSync').returns('invalid json {')

      try {
        await createConnector('/input/path')
        expect.fail('Should have thrown an error')
      } catch (error) {
        expect((error as Error).message).to.include('JSON')
      }
    })

    it('should read manifest from correct path', async () => {
      const manifestContent = JSON.stringify({
        name: 'my-connector',
        version: '1.0.0'
      })

      readFileSyncStub = sinon.stub(fs, 'readFileSync').returns(manifestContent)
      requestAPIStub = sinon.stub(request, 'requestAPI').resolves({
        status: 201,
        data: {
          upload_url: 'https://example.com/upload'
        }
      } as any)

      await createConnector('/test/input/path')

      const callArgs = readFileSyncStub.getCall(0)
      expect(callArgs.args[0]).to.equal(join('/test/input/path', 'manifest.json'))
    })
  })

  describe('cleanupPackageArchive', () => {
    let unlinkStub: sinon.SinonStub

    afterEach(() => {
      sinon.restore()
    })

    it('should delete the package archive file', async () => {
      unlinkStub = sinon.stub(fs, 'unlink').callsFake((path: fs.PathLike, callback: any) => {
        callback(null)
      })

      await publishModule.cleanupPackageArchive('/path/to/connector.zip')

      expect(unlinkStub.calledOnce).to.equal(true)
      expect(unlinkStub.getCall(0).args[0]).to.equal('/path/to/connector.zip')
    })

    it('should resolve successfully when file does not exist (ENOENT)', async () => {
      const error = new Error('ENOENT: no such file or directory')
      ;(error as any).code = 'ENOENT'

      unlinkStub = sinon.stub(fs, 'unlink').callsFake((path: fs.PathLike, callback: any) => {
        callback(error)
      })

      // Should not throw
      await publishModule.cleanupPackageArchive('/path/to/nonexistent.zip')

      expect(unlinkStub.calledOnce).to.equal(true)
    })

    it('should reject on deletion error (non-ENOENT)', async () => {
      const error = new Error('Permission denied')
      ;(error as any).code = 'EACCES'

      unlinkStub = sinon.stub(fs, 'unlink').callsFake((path: fs.PathLike, callback: any) => {
        callback(error)
      })

      try {
        await publishModule.cleanupPackageArchive('/path/to/connector.zip')
        expect.fail('Should have thrown an error')
      } catch (error) {
        expect((error as Error).message).to.include('Permission denied')
      }
    })

    it('should resolve when path is empty', async () => {
      unlinkStub = sinon.stub(fs, 'unlink')

      await publishModule.cleanupPackageArchive('')

      expect(unlinkStub.called).to.equal(false)
    })
  })

  describe('uploadConnectorPackage', () => {
    let unlinkStub: sinon.SinonStub

    afterEach(() => {
      sinon.restore()
    })

    const setupMocks = () => {
      sinon.stub(fs, 'readFileSync').returns(Buffer.from('zip content'))
      unlinkStub = sinon.stub(fs, 'unlink').callsFake((path: fs.PathLike, callback: any) => {
        callback(null)
      })
    }

    it('should successfully upload connector package with 200 status', async () => {
      setupMocks()
      const requestRawStub = sinon.stub(request, 'requestRaw').resolves({
        status: 200,
        data: { success: true }
      } as any)

      await uploadConnectorPackage(testDataPath, 'https://bucket.s3.amazonaws.com/upload', 'test-connector')
      expect(requestRawStub.calledOnce).to.equal(true)
      expect(unlinkStub.calledOnce).to.equal(true)
    })

    it('should call requestRaw with correct URL and method', async () => {
      setupMocks()
      const requestRawStub = sinon.stub(request, 'requestRaw').resolves({ status: 200 } as any)

      const uploadUrl = 'https://bucket.s3.amazonaws.com/path/bundle.zip'
      await uploadConnectorPackage(testDataPath, uploadUrl, 'test-connector')

      const callArgs = requestRawStub.getCall(0)
      expect(callArgs.args[0]).to.equal(uploadUrl)
      expect(callArgs.args[1].method).to.equal('PUT')
    })

    it('should include x-amz-server-side-encryption header', async () => {
      setupMocks()
      const requestRawStub = sinon.stub(request, 'requestRaw').resolves({ status: 200 } as any)

      await uploadConnectorPackage(testDataPath, 'https://s3.amazonaws.com/bucket', 'test-connector')

      const callArgs = requestRawStub.getCall(0)
      expect(callArgs.args[1].headers['x-amz-server-side-encryption']).to.equal('AES256')
    })

    it('should throw error when upload status is not 200', async () => {
      setupMocks()
      sinon.stub(request, 'requestRaw').resolves({
        status: 403,
        data: { error: 'Forbidden' }
      } as any)

      try {
        await uploadConnectorPackage(testDataPath, 'https://s3.amazonaws.com/bucket', 'test-connector')
        expect(unlinkStub.calledOnce).to.equal(true)
        expect.fail('Should have thrown an error')
      } catch (error) {
        expect((error as Error).message).to.include('Upload failed with status 403')
      }
    })

    it('should throw error when connector name is missing', async () => {
      try {
        await uploadConnectorPackage('/input/path', 'https://s3.amazonaws.com/bucket', '')
        expect.fail('Should have thrown an error')
      } catch (error) {
        expect((error as Error).message).to.include('Connector name is required')
      }
    })

    it('should cleanup archive file after successful upload', async () => {
      setupMocks()
      sinon.stub(request, 'requestRaw').resolves({ status: 200 } as any)

      await uploadConnectorPackage(testDataPath, 'https://s3.amazonaws.com/bucket', 'test-connector')

      expect(unlinkStub.calledOnce).to.equal(true)
    })
  })
})
