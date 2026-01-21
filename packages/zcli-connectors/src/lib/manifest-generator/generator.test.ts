/* eslint-disable @typescript-eslint/no-explicit-any */
import { expect, test } from '@oclif/test'
import * as fs from 'fs'
import * as path from 'path'
import * as sinon from 'sinon'
import sinonChai from 'sinon-chai'
import { use } from 'chai'
import { ManifestGenerator } from './generator'
import { ConnectorConfig } from './types'

use(sinonChai)

describe('ManifestGenerator', () => {
  const mockOutputPath = './test/output'
  const mockConnectorPath = '/test/output/connector.js'
  const mockManifestPath = '/test/output/manifest.json'

  let writeFileSyncStub: sinon.SinonStub
  let joinStub: sinon.SinonStub

  beforeEach(() => {
    writeFileSyncStub = sinon.stub()
    joinStub = sinon.stub()

    sinon.replace(fs, 'writeFileSync', writeFileSyncStub)
    sinon.replace(path, 'join', joinStub)

    joinStub
      .withArgs(mockOutputPath, 'connector.js').returns(mockConnectorPath)
      .withArgs(mockOutputPath, 'manifest.json').returns(mockManifestPath)
  })

  afterEach(() => {
    sinon.restore()
  })

  describe('generateManifest', () => {
    const validConnector: ConnectorConfig = {
      name: 'test-connector',
      title: 'Test Connector',
      description: 'A test connector',
      author: 'Test Author',
      version: '2.0.0',
      platform_version: '1.5.0',
      default_locale: 'en-US'
    }

    test
      .stub(ManifestGenerator as any, 'loadConnector', () => Promise.resolve(validConnector))
      .it('should generate manifest with all connector properties', async () => {
        await ManifestGenerator.generateManifest({ outputPath: mockOutputPath })

        const expectedManifest = {
          name: 'test-connector',
          title: 'Test Connector',
          description: 'A test connector',
          author: 'Test Author',
          version: '2.0.0',
          platform_version: '1.5.0',
          default_locale: 'en-US',
          metadata: {
            connection_type: 'test-connector'
          }
        }

        expect(writeFileSyncStub).to.have.been.calledWith(
          mockManifestPath,
          JSON.stringify(expectedManifest, null, 2),
          'utf-8'
        )
      })

    test
      .stub(ManifestGenerator as any, 'loadConnector', () => Promise.resolve({
        name: 'minimal-connector',
        title: 'Minimal Connector',
        description: 'A minimal connector'
      }))
      .it('should use default values when optional properties are missing', async () => {
        await ManifestGenerator.generateManifest({ outputPath: mockOutputPath })

        const expectedManifest = {
          name: 'minimal-connector',
          title: 'Minimal Connector',
          description: 'A minimal connector',
          author: undefined,
          version: '1.0.0',
          platform_version: '1.0.0',
          default_locale: 'en-US',
          metadata: {
            connection_type: 'minimal-connector'
          }
        }

        expect(writeFileSyncStub).to.have.been.calledWith(
          mockManifestPath,
          JSON.stringify(expectedManifest, null, 2),
          'utf-8'
        )
      })

    test
      .stub(ManifestGenerator as any, 'loadConnector', () => Promise.resolve({
        name: 'test-connector'
      }))
      .it('should throw error when required properties are missing', async () => {
        try {
          await ManifestGenerator.generateManifest({ outputPath: mockOutputPath })
          expect.fail('Expected error to be thrown')
        } catch (error: any) {
          expect(error.message).to.include('Connector is missing required properties: title, description')
        }
      })

    test
      .stub(ManifestGenerator as any, 'loadConnector', () => Promise.resolve(validConnector))
      .it('should handle connector module with default export', async () => {
        await ManifestGenerator.generateManifest({ outputPath: mockOutputPath })

        const expectedManifest = {
          name: 'test-connector',
          title: 'Test Connector',
          description: 'A test connector',
          author: 'Test Author',
          version: '2.0.0',
          platform_version: '1.5.0',
          default_locale: 'en-US',
          metadata: {
            connection_type: 'test-connector'
          }
        }

        expect(writeFileSyncStub).to.have.been.calledWith(
          mockManifestPath,
          JSON.stringify(expectedManifest, null, 2),
          'utf-8'
        )
      })
  })

  describe('validateConnector', () => {
    it('should not throw for valid connector', () => {
      const validConnector: ConnectorConfig = {
        name: 'test',
        title: 'Test',
        description: 'Test description',
        author: '',
        version: '',
        default_locale: '',
        platform_version: ''
      }

      expect(() => {
        (ManifestGenerator as any).validateConnector(validConnector)
      }).to.not.throw()
    })

    it('should throw for connector missing name', () => {
      const invalidConnector = {
        title: 'Test',
        description: 'Test description'
      } as ConnectorConfig

      expect(() => {
        (ManifestGenerator as any).validateConnector(invalidConnector)
      }).to.throw('Connector is missing required properties: name')
    })

    it('should throw for connector missing multiple properties', () => {
      const invalidConnector = {
        name: 'test'
      } as ConnectorConfig

      expect(() => {
        (ManifestGenerator as any).validateConnector(invalidConnector)
      }).to.throw('Connector is missing required properties: title, description')
    })
  })
})
