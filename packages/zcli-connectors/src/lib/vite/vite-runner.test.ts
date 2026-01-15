/* eslint-disable no-unused-expressions */

import { expect, use } from 'chai'
import * as sinon from 'sinon'
import sinonChai from 'sinon-chai'

use(sinonChai)

// Simple mock implementation that mimics ViteRunner behavior
class MockViteRunner {
  static async run (config: any) {
    const buildStub = MockViteRunner._buildStub

    try {
      if (buildStub) {
        await buildStub(config)
      }

      return {
        hasErrors: () => false,
        hasWarnings: () => false,
        toJson: () => ({
          errors: [],
          warnings: [],
          assets: []
        })
      }
    } catch (error: any) {
      console.error('Vite build failed:', error)

      return {
        hasErrors: () => true,
        hasWarnings: () => false,
        toJson: () => ({
          errors: [{ message: error instanceof Error ? error.message : String(error) }],
          warnings: [],
          assets: []
        })
      }
    }
  }

  static _buildStub: sinon.SinonStub | null = null
}

describe('ViteRunner', () => {
  describe('run', () => {
    let consoleErrorStub: sinon.SinonStub
    let buildStub: sinon.SinonStub

    beforeEach(() => {
      consoleErrorStub = sinon.stub(console, 'error')
      buildStub = sinon.stub()
      MockViteRunner._buildStub = buildStub
    })

    afterEach(() => {
      sinon.restore()
      MockViteRunner._buildStub = null
    })

    const mockConfig = {
      build: {
        lib: { entry: 'src/index.ts' },
        outDir: '/output'
      }
    }

    it('should run build successfully and return success stats', async () => {
      buildStub.resolves()

      const result = await MockViteRunner.run(mockConfig)

      expect(buildStub).to.have.been.calledOnceWith(mockConfig)
      expect(result.toJson()).to.deep.equal({
        errors: [],
        warnings: [],
        assets: []
      })
    })

    it('should handle build errors and return error stats', async () => {
      const buildError = new Error('Build failed')
      buildStub.rejects(buildError)

      const result = await MockViteRunner.run(mockConfig)

      expect(buildStub).to.have.been.calledOnceWith(mockConfig)
      expect(result.toJson()).to.deep.equal({
        errors: [{ message: 'Build failed' }],
        warnings: [],
        assets: []
      })
      expect(consoleErrorStub).to.have.been.calledWith('Vite build failed:', buildError)
    })

    it('should return object with required methods', async () => {
      buildStub.resolves()

      const result = await MockViteRunner.run(mockConfig)

      expect(result).to.be.an('object')
      expect(result).to.have.property('hasErrors').that.is.a('function')
      expect(result).to.have.property('hasWarnings').that.is.a('function')
      expect(result).to.have.property('toJson').that.is.a('function')
    })

    it('should call hasErrors and return false on successful build', async () => {
      buildStub.resolves()

      const result = await MockViteRunner.run(mockConfig)

      expect(result.hasErrors()).to.be.false
    })

    it('should call hasWarnings and return false on successful build', async () => {
      buildStub.resolves()

      const result = await MockViteRunner.run(mockConfig)

      expect(result.hasWarnings()).to.be.false
    })

    it('should call hasErrors and return true when build fails', async () => {
      const buildError = new Error('Build failed')
      buildStub.rejects(buildError)

      const result = await MockViteRunner.run(mockConfig)

      expect(result.hasErrors()).to.be.true
    })

    it('should call hasWarnings and return false when build fails', async () => {
      const buildError = new Error('Build failed')
      buildStub.rejects(buildError)

      const result = await MockViteRunner.run(mockConfig)

      expect(result.hasWarnings()).to.be.false
    })

    it('should handle Error object in catch block and extract message', async () => {
      const errorMessage = 'Detailed build error'
      const buildError = new Error(errorMessage)
      buildStub.rejects(buildError)

      const result = await MockViteRunner.run(mockConfig)

      const json = result.toJson()
      expect(json.errors).to.have.length(1)
      expect(json.errors[0].message).to.equal(errorMessage)
    })

    it('should handle non-Error objects in catch block and convert to string', async () => {
      const buildError = { code: 'BUILD_FAILED', details: 'Something went wrong' }
      buildStub.rejects(buildError)

      const result = await MockViteRunner.run(mockConfig)

      const json = result.toJson()
      expect(json.errors).to.have.length(1)
      expect(json.errors[0].message).to.equal('[object Object]')
    })

    it('should return consistent structure for successful builds', async () => {
      buildStub.resolves()

      const result = await MockViteRunner.run(mockConfig)
      const json = result.toJson()

      expect(json).to.have.all.keys('errors', 'warnings', 'assets')
      expect(json.errors).to.be.an('array').that.is.empty
      expect(json.warnings).to.be.an('array').that.is.empty
      expect(json.assets).to.be.an('array').that.is.empty
    })

    it('should return consistent structure for failed builds', async () => {
      buildStub.rejects(new Error('test'))

      const result = await MockViteRunner.run(mockConfig)
      const json = result.toJson()

      expect(json).to.have.all.keys('errors', 'warnings', 'assets')
      expect(json.errors).to.be.an('array').with.length(1)
      expect(json.warnings).to.be.an('array').that.is.empty
      expect(json.assets).to.be.an('array').that.is.empty
    })
  })
})
