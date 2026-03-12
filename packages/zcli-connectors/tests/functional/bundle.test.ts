/* eslint-disable no-unused-expressions */

import { expect, use } from 'chai'
import * as sinon from 'sinon'
import sinonChai from 'sinon-chai'
import * as fs from 'fs'
import * as childProcess from 'child_process'
import BundleCommand from '../../src/commands/connectors/bundle'
import { ViteConfigBuilder, ViteRunner } from '../../src/lib/vite'

use(sinonChai)

describe('bundle', () => {
  let fsStubs: any
  let viteStubs: any
  let bundleCommand: BundleCommand
  let logStub: sinon.SinonStub

  beforeEach(() => {
    fsStubs = {
      existsSync: sinon.stub(fs, 'existsSync').callsFake((path: fs.PathLike) => {
        const pathStr = String(path)
        // Return false for tsconfig.json (to skip type check) and for non-existent connector dirs in specific tests
        if (pathStr.includes('tsconfig.json')) return false
        if (pathStr.includes('/nonexistent') || pathStr.includes('\\nonexistent')) return false
        return true // connector root and dist directories exist by default
      }),
      mkdirSync: sinon.stub(fs, 'mkdirSync')
    }

    viteStubs = {
      createConfig: sinon.stub(ViteConfigBuilder, 'createConfig').returns({
        build: {
          watch: false,
          target: '',
          lib: {
            entry: '',
            fileName: '',
            formats: []
          },
          outDir: '',
          minify: false,
          rollupOptions: {
            plugins: [],
            external: function (id: string): boolean {
              throw new Error('Function not implemented.')
            },
            output: {
              inlineDynamicImports: false,
              format: ''
            }
          }
        }
      }),
      run: sinon.stub(ViteRunner, 'run').resolves({
        hasErrors: () => false,
        hasWarnings: () => false,
        toJson: () => ({ errors: [], warnings: [], assets: [] })
      })
    }

    sinon.stub(console, 'log')

    // Create a command instance and stub the parse method
    bundleCommand = new BundleCommand([], {} as any)
    sinon.stub(bundleCommand, 'parse' as any).resolves({
      args: { path: '.' },
      flags: { output: undefined, watch: false, verbose: false }
    })
    logStub = sinon.stub(bundleCommand, 'log')
  })

  afterEach(() => {
    sinon.restore()
  })

  it('should run bundle command successfully', async () => {
    await bundleCommand.run()

    expect(viteStubs.createConfig).to.have.been.called
    expect(viteStubs.run).to.have.been.called
  })

  it('should create output directory if it does not exist', async () => {
    // Make connector root exist but dist directory not exist
    fsStubs.existsSync.callsFake((path: fs.PathLike) => {
      const pathStr = String(path)
      if (pathStr.includes('tsconfig.json')) return false
      if (pathStr.endsWith('/dist') || pathStr.endsWith('\\dist')) return false
      return true // connector root exists
    })

    await bundleCommand.run()

    expect(fsStubs.mkdirSync).to.have.been.called
  })

  it('should handle build errors', async () => {
    viteStubs.run.resolves({
      hasErrors: () => true,
      hasWarnings: () => false,
      toJson: () => ({
        errors: [{ message: 'Build failed' }],
        warnings: [],
        assets: []
      })
    })

    try {
      await bundleCommand.run()
      expect.fail('Should have thrown an error')
    } catch (error) {
      expect(error).to.be.instanceOf(Error)
      expect(logStub).to.have.been.calledWith(sinon.match(/Build failed/))
    }
  })

  it('should handle build warnings', async () => {
    viteStubs.run.resolves({
      hasErrors: () => false,
      hasWarnings: () => true,
      toJson: () => ({
        errors: [],
        warnings: [{ message: 'Warning message' }],
        assets: []
      })
    })

    await bundleCommand.run()
    expect(logStub).to.have.been.calledWith(sinon.match(/Warning message/))
  })

  it('should pass correct config to ViteConfigBuilder', async () => {
    (bundleCommand as any).parse = sinon.stub().resolves({
      args: { path: './test-dir' },
      flags: { watch: false, verbose: false }
    })

    await bundleCommand.run()

    expect(viteStubs.createConfig).to.have.been.calledWith(
      sinon.match({
        watch: false
      })
    )
  })

  it('should enable watch mode', async () => {
    (bundleCommand as any).parse = sinon.stub().resolves({
      args: { path: '.' },
      flags: { watch: true, verbose: false }
    })

    await bundleCommand.run()

    expect(viteStubs.createConfig).to.have.been.calledWith(
      sinon.match({
        watch: true
      })
    )
  })

  it('should fail bundle if TypeScript compilation fails', async () => {
    (bundleCommand as any).parse = sinon.stub().resolves({
      args: { path: './test-dir' },
      flags: { watch: false, verbose: true }
    })

    fsStubs.existsSync.returns(true)

    const execSyncStub = sinon.stub(childProcess, 'execFileSync')
    execSyncStub.throws(new Error('TypeScript compilation error'))

    try {
      await bundleCommand.run()
      expect.fail('Should have thrown an error')
    } catch (error) {
      expect(error).to.be.instanceOf(Error)
      expect(logStub).to.have.been.calledWith(sinon.match(/compilation check failed/i))
    } finally {
      execSyncStub.restore()
    }
  })

  it('should fail if connector directory does not exist', async () => {
    (bundleCommand as any).parse = sinon.stub().resolves({
      args: { path: './nonexistent-dir' },
      flags: { watch: false, verbose: false }
    })

    const errorStub = sinon.stub(bundleCommand, 'error').callsFake((message: any, options: any) => {
      const err = new Error(String(message))
      ;(err as any).options = options
      throw err
    })
    try {
      await bundleCommand.run()
      expect.fail('Expected bundleCommand.run() to throw when connector directory does not exist')
    } catch (error: any) {
      expect(errorStub).to.have.been.calledWith(
        sinon.match(/Connector root directory does not exist/),
        sinon.match({ exit: 1 })
      )
      expect(error.message).to.match(/Connector root directory does not exist/)
    } finally {
      errorStub.restore()
    }
  })
})
