import { expect } from 'chai'
import * as sinon from 'sinon'
import * as fs from 'fs'
import { validateManifest } from './manifestValidation'
import type { ValidationContext } from './index'

describe('validateManifest', () => {
  let readFileSyncStub: sinon.SinonStub
  let logSpy: sinon.SinonSpy

  beforeEach(() => {
    readFileSyncStub = sinon.stub(fs, 'readFileSync')
    logSpy = sinon.spy()
  })

  afterEach(() => {
    sinon.restore()
  })

  describe('successful validation', () => {
    it('should pass validation for a valid manifest', async () => {
      const validManifest = {
        name: 'my-connector',
        title: 'My Connector',
        version: '1.0.0',
        author: 'Test Author',
        platform_version: '1.0.0',
        default_locale: 'en-us',
        metadata: {}
      }

      readFileSyncStub.returns(JSON.stringify(validManifest))

      const context: ValidationContext = {
        inputPath: '/test/path',
        options: { verbose: false },
        log: logSpy
      }

      await validateManifest(context)
      expect(logSpy.called).to.equal(false)
    })

    it('should accept valid connector names with hyphens and numbers', async () => {
      const validManifest = {
        name: 'my-awesome-connector-123',
        title: 'My Awesome Connector',
        version: '1.0.0',
        author: 'Test Author',
        platform_version: '1.0.0',
        default_locale: 'en-us',
        metadata: {}
      }

      readFileSyncStub.returns(JSON.stringify(validManifest))

      const context: ValidationContext = {
        inputPath: '/test/path',
        options: { verbose: false },
        log: logSpy
      }

      await validateManifest(context)
      expect(logSpy.called).to.equal(false)
    })

    it('should accept valid semver versions with pre-release and build metadata', async () => {
      const validManifest = {
        name: 'my-connector',
        title: 'My Connector',
        version: '1.2.3-beta.1+build.456',
        author: 'Test Author',
        platform_version: '1.0.0',
        default_locale: 'en-us',
        metadata: {}
      }

      readFileSyncStub.returns(JSON.stringify(validManifest))

      const context: ValidationContext = {
        inputPath: '/test/path',
        options: { verbose: false },
        log: logSpy
      }

      await validateManifest(context)
      expect(logSpy.called).to.equal(false)
    })
  })

  describe('validation failures', () => {
    it('should throw error for invalid JSON in manifest file', async () => {
      readFileSyncStub.returns('{ invalid json }')

      const context: ValidationContext = {
        inputPath: '/test/path',
        options: { verbose: false },
        log: logSpy
      }

      try {
        await validateManifest(context)
        expect.fail('Should have thrown an error')
      } catch (error) {
        expect((error as Error).message).to.include('Manifest file is not valid JSON')
      }
    })

    it('should throw error for missing required fields', async () => {
      const invalidManifest = {
        name: 'my-connector',
        version: '1.0.0'
      }

      readFileSyncStub.returns(JSON.stringify(invalidManifest))

      const context: ValidationContext = {
        inputPath: '/test/path',
        options: { verbose: false },
        log: logSpy
      }

      try {
        await validateManifest(context)
        expect.fail('Should have thrown an error')
      } catch (error) {
        expect((error as Error).message).to.include('Missing required fields')
      }
    })

    it('should throw error for invalid version format', async () => {
      const invalidManifest = {
        name: 'my-connector',
        title: 'My Connector',
        version: '1.0',
        author: 'Test Author',
        platform_version: '1.0.0',
        default_locale: 'en-us',
        metadata: {}
      }

      readFileSyncStub.returns(JSON.stringify(invalidManifest))

      const context: ValidationContext = {
        inputPath: '/test/path',
        options: { verbose: false },
        log: logSpy
      }

      try {
        await validateManifest(context)
        expect.fail('Should have thrown an error')
      } catch (error) {
        expect((error as Error).message).to.include('is not valid')
      }
    })

    it('should throw error for invalid connector name with uppercase', async () => {
      const invalidManifest = {
        name: 'My-Connector',
        title: 'My Connector',
        version: '1.0.0',
        author: 'Test Author',
        platform_version: '1.0.0',
        default_locale: 'en-us',
        metadata: {}
      }

      readFileSyncStub.returns(JSON.stringify(invalidManifest))

      const context: ValidationContext = {
        inputPath: '/test/path',
        options: { verbose: false },
        log: logSpy
      }

      try {
        await validateManifest(context)
        expect.fail('Should have thrown an error')
      } catch (error) {
        expect((error as Error).message).to.include('must contain only lowercase letters')
      }
    })

    it('should throw error for invalid connector name with underscore', async () => {
      const invalidManifest = {
        name: 'my_connector',
        title: 'My Connector',
        version: '1.0.0',
        author: 'Test Author',
        platform_version: '1.0.0',
        default_locale: 'en-us',
        metadata: {}
      }

      readFileSyncStub.returns(JSON.stringify(invalidManifest))

      const context: ValidationContext = {
        inputPath: '/test/path',
        options: { verbose: false },
        log: logSpy
      }

      try {
        await validateManifest(context)
        expect.fail('Should have thrown an error')
      } catch (error) {
        expect((error as Error).message).to.include('must contain only lowercase letters')
      }
    })

    it('should throw error for connector name with leading hyphen', async () => {
      const invalidManifest = {
        name: '-my-connector',
        title: 'My Connector',
        version: '1.0.0',
        author: 'Test Author',
        platform_version: '1.0.0',
        default_locale: 'en-us',
        metadata: {}
      }

      readFileSyncStub.returns(JSON.stringify(invalidManifest))

      const context: ValidationContext = {
        inputPath: '/test/path',
        options: { verbose: false },
        log: logSpy
      }

      try {
        await validateManifest(context)
        expect.fail('Should have thrown an error')
      } catch (error) {
        expect((error as Error).message).to.include('must contain only lowercase letters')
      }
    })

    it('should throw error for connector name with consecutive hyphens', async () => {
      const invalidManifest = {
        name: 'my--connector',
        title: 'My Connector',
        version: '1.0.0',
        author: 'Test Author',
        platform_version: '1.0.0',
        default_locale: 'en-us',
        metadata: {}
      }

      readFileSyncStub.returns(JSON.stringify(invalidManifest))

      const context: ValidationContext = {
        inputPath: '/test/path',
        options: { verbose: false },
        log: logSpy
      }

      try {
        await validateManifest(context)
        expect.fail('Should have thrown an error')
      } catch (error) {
        expect((error as Error).message).to.include('must contain only lowercase letters')
      }
    })

    it('should throw error for unsupported default_locale', async () => {
      const invalidManifest = {
        name: 'my-connector',
        title: 'My Connector',
        version: '1.0.0',
        author: 'Test Author',
        platform_version: '1.0.0',
        default_locale: 'xx-xx',
        metadata: {}
      }

      readFileSyncStub.returns(JSON.stringify(invalidManifest))

      const context: ValidationContext = {
        inputPath: '/test/path',
        options: { verbose: false },
        log: logSpy
      }

      try {
        await validateManifest(context)
        expect.fail('Should have thrown an error')
      } catch (error) {
        expect((error as Error).message).to.include('is not supported')
      }
    })

    it('should throw error for connector name too short', async () => {
      const invalidManifest = {
        name: 'ab',
        title: 'My Connector',
        version: '1.0.0',
        author: 'Test Author',
        platform_version: '1.0.0',
        default_locale: 'en-us',
        metadata: {}
      }

      readFileSyncStub.returns(JSON.stringify(invalidManifest))

      const context: ValidationContext = {
        inputPath: '/test/path',
        options: { verbose: false },
        log: logSpy
      }

      try {
        await validateManifest(context)
        expect.fail('Should have thrown an error')
      } catch (error) {
        expect((error as Error).message).to.include('must be 3-128 characters')
      }
    })

    it('should throw error for connector name too long', async () => {
      const invalidManifest = {
        name: 'a'.repeat(129),
        title: 'My Connector',
        version: '1.0.0',
        author: 'Test Author',
        platform_version: '1.0.0',
        default_locale: 'en-us',
        metadata: {}
      }

      readFileSyncStub.returns(JSON.stringify(invalidManifest))

      const context: ValidationContext = {
        inputPath: '/test/path',
        options: { verbose: false },
        log: logSpy
      }

      try {
        await validateManifest(context)
        expect.fail('Should have thrown an error')
      } catch (error) {
        expect((error as Error).message).to.include('must be 3-128 characters')
      }
    })

    it('should throw error for title too short', async () => {
      const invalidManifest = {
        name: 'my-connector',
        title: 'AB',
        version: '1.0.0',
        author: 'Test Author',
        platform_version: '1.0.0',
        default_locale: 'en-us',
        metadata: {}
      }

      readFileSyncStub.returns(JSON.stringify(invalidManifest))

      const context: ValidationContext = {
        inputPath: '/test/path',
        options: { verbose: false },
        log: logSpy
      }

      try {
        await validateManifest(context)
        expect.fail('Should have thrown an error')
      } catch (error) {
        expect((error as Error).message).to.include('must be 3-128 characters')
      }
    })

    it('should throw error for title too long', async () => {
      const invalidManifest = {
        name: 'my-connector',
        title: 'A'.repeat(129),
        version: '1.0.0',
        author: 'Test Author',
        platform_version: '1.0.0',
        default_locale: 'en-us',
        metadata: {}
      }

      readFileSyncStub.returns(JSON.stringify(invalidManifest))

      const context: ValidationContext = {
        inputPath: '/test/path',
        options: { verbose: false },
        log: logSpy
      }

      try {
        await validateManifest(context)
        expect.fail('Should have thrown an error')
      } catch (error) {
        expect((error as Error).message).to.include('must be 3-128 characters')
      }
    })

    it('should throw error for author too long', async () => {
      const invalidManifest = {
        name: 'my-connector',
        title: 'My Connector',
        version: '1.0.0',
        author: 'A'.repeat(129),
        platform_version: '1.0.0',
        default_locale: 'en-us',
        metadata: {}
      }

      readFileSyncStub.returns(JSON.stringify(invalidManifest))

      const context: ValidationContext = {
        inputPath: '/test/path',
        options: { verbose: false },
        log: logSpy
      }

      try {
        await validateManifest(context)
        expect.fail('Should have thrown an error')
      } catch (error) {
        expect((error as Error).message).to.include('must be 1-128 characters')
      }
    })

    it('should throw error for author empty string', async () => {
      const invalidManifest = {
        name: 'my-connector',
        title: 'My Connector',
        version: '1.0.0',
        author: '',
        platform_version: '1.0.0',
        default_locale: 'en-us',
        metadata: {}
      }

      readFileSyncStub.returns(JSON.stringify(invalidManifest))

      const context: ValidationContext = {
        inputPath: '/test/path',
        options: { verbose: false },
        log: logSpy
      }

      try {
        await validateManifest(context)
        expect.fail('Should have thrown an error')
      } catch (error) {
        expect((error as Error).message).to.include('must be 1-128 characters')
      }
    })

    it('should throw error for name not a string', async () => {
      const invalidManifest = {
        name: 123,
        title: 'My Connector',
        version: '1.0.0',
        author: 'Test Author',
        platform_version: '1.0.0',
        default_locale: 'en-us',
        metadata: {}
      }

      readFileSyncStub.returns(JSON.stringify(invalidManifest))

      const context: ValidationContext = {
        inputPath: '/test/path',
        options: { verbose: false },
        log: logSpy
      }

      try {
        await validateManifest(context)
        expect.fail('Should have thrown an error')
      } catch (error) {
        expect((error as Error).message).to.include('must be a string')
      }
    })

    it('should throw error for title not a string', async () => {
      const invalidManifest = {
        name: 'my-connector',
        title: true,
        version: '1.0.0',
        author: 'Test Author',
        platform_version: '1.0.0',
        default_locale: 'en-us',
        metadata: {}
      }

      readFileSyncStub.returns(JSON.stringify(invalidManifest))

      const context: ValidationContext = {
        inputPath: '/test/path',
        options: { verbose: false },
        log: logSpy
      }

      try {
        await validateManifest(context)
        expect.fail('Should have thrown an error')
      } catch (error) {
        expect((error as Error).message).to.include('must be a string')
      }
    })

    it('should throw error for author not a string', async () => {
      const invalidManifest = {
        name: 'my-connector',
        title: 'My Connector',
        version: '1.0.0',
        author: { name: 'Test' },
        platform_version: '1.0.0',
        default_locale: 'en-us',
        metadata: {}
      }

      readFileSyncStub.returns(JSON.stringify(invalidManifest))

      const context: ValidationContext = {
        inputPath: '/test/path',
        options: { verbose: false },
        log: logSpy
      }

      try {
        await validateManifest(context)
        expect.fail('Should have thrown an error')
      } catch (error) {
        expect((error as Error).message).to.include('must be a string')
      }
    })

    it('should throw error for version not a string', async () => {
      const invalidManifest = {
        name: 'my-connector',
        title: 'My Connector',
        version: 1.0,
        author: 'Test Author',
        platform_version: '1.0.0',
        default_locale: 'en-us',
        metadata: {}
      }

      readFileSyncStub.returns(JSON.stringify(invalidManifest))

      const context: ValidationContext = {
        inputPath: '/test/path',
        options: { verbose: false },
        log: logSpy
      }

      try {
        await validateManifest(context)
        expect.fail('Should have thrown an error')
      } catch (error) {
        expect((error as Error).message).to.include('must be a string')
      }
    })

    it('should throw error for platform_version not a string', async () => {
      const invalidManifest = {
        name: 'my-connector',
        title: 'My Connector',
        version: '1.0.0',
        author: 'Test Author',
        platform_version: 1,
        default_locale: 'en-us',
        metadata: {}
      }

      readFileSyncStub.returns(JSON.stringify(invalidManifest))

      const context: ValidationContext = {
        inputPath: '/test/path',
        options: { verbose: false },
        log: logSpy
      }

      try {
        await validateManifest(context)
        expect.fail('Should have thrown an error')
      } catch (error) {
        expect((error as Error).message).to.include('must be a string')
      }
    })

    it('should throw error for platform_version wrong version', async () => {
      const invalidManifest = {
        name: 'my-connector',
        title: 'My Connector',
        version: '1.0.0',
        author: 'Test Author',
        platform_version: '2.0.0',
        default_locale: 'en-us',
        metadata: {}
      }

      readFileSyncStub.returns(JSON.stringify(invalidManifest))

      const context: ValidationContext = {
        inputPath: '/test/path',
        options: { verbose: false },
        log: logSpy
      }

      try {
        await validateManifest(context)
        expect.fail('Should have thrown an error')
      } catch (error) {
        expect((error as Error).message).to.include('must be "1.0.0"')
      }
    })

    it('should throw error for default_locale not a string', async () => {
      const invalidManifest = {
        name: 'my-connector',
        title: 'My Connector',
        version: '1.0.0',
        author: 'Test Author',
        platform_version: '1.0.0',
        default_locale: ['en-us'],
        metadata: {}
      }

      readFileSyncStub.returns(JSON.stringify(invalidManifest))

      const context: ValidationContext = {
        inputPath: '/test/path',
        options: { verbose: false },
        log: logSpy
      }

      try {
        await validateManifest(context)
        expect.fail('Should have thrown an error')
      } catch (error) {
        expect((error as Error).message).to.include('must be a string')
      }
    })

    it('should accept default_locale in upper or mixed case', async () => {
      const validManifest = {
        name: 'my-connector',
        title: 'My Connector',
        version: '1.0.0',
        author: 'Test Author',
        platform_version: '1.0.0',
        default_locale: 'En-Us',
        metadata: { connection_type: 'my-connector' }
      }
      readFileSyncStub.returns(JSON.stringify(validManifest))
      const context: ValidationContext = {
        inputPath: '/test/path',
        options: { verbose: false },
        log: logSpy
      }
      await validateManifest(context)
    })

    it('should throw error for metadata not an object', async () => {
      const invalidManifest = {
        name: 'my-connector',
        title: 'My Connector',
        version: '1.0.0',
        author: 'Test Author',
        platform_version: '1.0.0',
        default_locale: 'en-us',
        metadata: 'not an object'
      }

      readFileSyncStub.returns(JSON.stringify(invalidManifest))

      const context: ValidationContext = {
        inputPath: '/test/path',
        options: { verbose: false },
        log: logSpy
      }

      try {
        await validateManifest(context)
        expect.fail('Should have thrown an error')
      } catch (error) {
        expect((error as Error).message).to.include('must be an object')
      }
    })

    it('should throw error for metadata as an array', async () => {
      const invalidManifest = {
        name: 'my-connector',
        title: 'My Connector',
        version: '1.0.0',
        author: 'Test Author',
        platform_version: '1.0.0',
        default_locale: 'en-us',
        metadata: []
      }
      readFileSyncStub.returns(JSON.stringify(invalidManifest))
      const context: ValidationContext = {
        inputPath: '/test/path',
        options: { verbose: false },
        log: logSpy
      }
      try {
        await validateManifest(context)
        expect.fail('Should have thrown an error')
      } catch (error) {
        expect((error as Error).message).to.include('must be an object')
      }
    })

    it('should throw error for connection_type not a string', async () => {
      const invalidManifest = {
        name: 'my-connector',
        title: 'My Connector',
        version: '1.0.0',
        author: 'Test Author',
        platform_version: '1.0.0',
        default_locale: 'en-us',
        metadata: {
          connection_type: 123
        }
      }

      readFileSyncStub.returns(JSON.stringify(invalidManifest))

      const context: ValidationContext = {
        inputPath: '/test/path',
        options: { verbose: false },
        log: logSpy
      }

      try {
        await validateManifest(context)
        expect.fail('Should have thrown an error')
      } catch (error) {
        expect((error as Error).message).to.include('must be a string')
      }
    })

    it('should throw error for connection_type set to zendesk', async () => {
      const invalidManifest = {
        name: 'my-connector',
        title: 'My Connector',
        version: '1.0.0',
        author: 'Test Author',
        platform_version: '1.0.0',
        default_locale: 'en-us',
        metadata: {
          connection_type: 'zendesk'
        }
      }

      readFileSyncStub.returns(JSON.stringify(invalidManifest))

      const context: ValidationContext = {
        inputPath: '/test/path',
        options: { verbose: false },
        log: logSpy
      }

      try {
        await validateManifest(context)
        expect.fail('Should have thrown an error')
      } catch (error) {
        expect((error as Error).message).to.include('cannot be "zendesk"')
      }
    })

    it('should throw error for connection_type set to empty string', async () => {
      const invalidManifest = {
        name: 'my-connector',
        title: 'My Connector',
        version: '1.0.0',
        author: 'Test Author',
        platform_version: '1.0.0',
        default_locale: 'en-us',
        metadata: {
          connection_type: ''
        }
      }

      readFileSyncStub.returns(JSON.stringify(invalidManifest))

      const context: ValidationContext = {
        inputPath: '/test/path',
        options: { verbose: false },
        log: logSpy
      }

      try {
        await validateManifest(context)
        expect.fail('Should have thrown an error')
      } catch (error) {
        expect((error as Error).message).to.include('must be a non-empty string')
      }
    })
  })
})
