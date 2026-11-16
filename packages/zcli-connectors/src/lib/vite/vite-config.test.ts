/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable no-unused-expressions */
import { expect } from 'chai'
import * as sinon from 'sinon'
import * as fs from 'fs'
import * as os from 'os'
import { join, resolve } from 'path'
import { ViteConfigBuilder } from './vite-config'
import { ManifestGenerator } from '../manifest-generator/generator'
import * as publishModule from '../publish/publish'

describe('ViteConfigBuilder', () => {
  let fsStubs: any
  let manifestStub: sinon.SinonStub
  let consoleErrorStub: sinon.SinonStub

  beforeEach(() => {
    // Properly stub the fs module functions
    fsStubs = {
      existsSync: sinon.stub(fs, 'existsSync'),
      copyFileSync: sinon.stub(fs, 'copyFileSync'),
      mkdirSync: sinon.stub(fs, 'mkdirSync'),
      readdirSync: sinon.stub(fs, 'readdirSync'),
      statSync: sinon.stub(fs, 'statSync')
    }

    manifestStub = sinon.stub(ManifestGenerator, 'generateManifest')
    consoleErrorStub = sinon.stub(console, 'error')
  })

  afterEach(() => {
    sinon.restore()
  })

  describe('outputPath validation', () => {
    it('should reject an outputPath equal to the connector directory before Vite runs', () => {
      // Reproduction of the review scenario: emptying the output directory
      // would erase src/index.ts and unrelated files in the connector root
      expect(() => ViteConfigBuilder.createConfig({
        inputPath: '/connector',
        outputPath: '/connector'
      })).to.throw(/must not be the connector directory/)
    })

    it('should reject an outputPath that is a parent of the connector directory', () => {
      expect(() => ViteConfigBuilder.createConfig({
        inputPath: '/workspace/connector',
        outputPath: '/workspace'
      })).to.throw(/must not be the connector directory/)
    })

    it('should reject an outputPath that is the src directory', () => {
      expect(() => ViteConfigBuilder.createConfig({
        inputPath: '/connector',
        outputPath: '/connector/src'
      })).to.throw(/must not overlap the connector src directory/)
    })

    it('should reject an outputPath nested inside the src directory', () => {
      expect(() => ViteConfigBuilder.createConfig({
        inputPath: '/connector',
        outputPath: '/connector/src/dist'
      })).to.throw(/must not overlap the connector src directory/)
    })

    it('should reject an outputPath that contains the src directory', () => {
      expect(() => ViteConfigBuilder.createConfig({
        inputPath: '/connector/pkg',
        outputPath: '/connector/pkg'
      })).to.throw(/must not be the connector directory/)
    })

    it('should accept the canonical dist output directory', () => {
      const config = ViteConfigBuilder.createConfig({
        inputPath: '/connector',
        outputPath: '/connector/dist'
      })

      expect(config.root).to.equal('/connector')
      expect(config.build.outDir).to.equal('/connector/dist')
    })

    it('should normalize trailing separators and dot segments before validating', () => {
      const config = ViteConfigBuilder.createConfig({
        inputPath: '/connector/',
        outputPath: '/connector/./dist/'
      })

      expect(config.root).to.equal('/connector/')
      // resolve() is platform-native; normalize the expectation the same way
      expect(resolve(config.build.outDir)).to.equal(resolve('/connector/dist'))
    })
  })

  describe('createAssetCopyPlugin', () => {
    it('should copy bundle contract files from assets and translations when writeBundle is called', async () => {
      const inputPath = '/input'
      const outputPath = '/output'

      // Mock directory structure - use normalized paths
      fsStubs.existsSync
        .withArgs(sinon.match.string).returns(false) // default
        .withArgs(sinon.match(/input.*assets/)).returns(true)
        .withArgs(sinon.match(/input.*translations/)).returns(true)

      fsStubs.readdirSync
        .withArgs(sinon.match(/input.*assets/)).returns(['logo.svg'])
        .withArgs(sinon.match(/input.*translations/)).returns(['en.json', 'vi.json'])

      fsStubs.statSync
        .withArgs(sinon.match(/logo\.svg/)).returns({ isDirectory: () => false })
        .withArgs(sinon.match(/en\.json/)).returns({ isDirectory: () => false })
        .withArgs(sinon.match(/vi\.json/)).returns({ isDirectory: () => false })

      fsStubs.mkdirSync.returns(undefined)
      fsStubs.copyFileSync.returns(undefined)

      const config = ViteConfigBuilder.createConfig({
        inputPath,
        outputPath
      })

      const assetPlugin = config.build.rollupOptions.plugins.find(
        (p: any) => p.name === 'copy-assets-translations'
      )

      // Execute writeBundle
      await assetPlugin.writeBundle()

      // Verify directories were created - use flexible path matching
      expect(fsStubs.mkdirSync.called).to.be.true
      expect(fsStubs.mkdirSync.firstCall.args).to.deep.equal([
        join('/output', 'assets'), { recursive: true }
      ])
      expect(fsStubs.mkdirSync.secondCall.args).to.deep.equal([
        join('/output', 'translations'), { recursive: true }
      ])

      // Verify only contract files were copied
      expect(fsStubs.copyFileSync.calledThrice).to.be.true
      expect(fsStubs.copyFileSync.firstCall.args).to.deep.equal([
        join('/input', 'src', 'assets', 'logo.svg'), join('/output', 'assets', 'logo.svg')
      ])
      expect(fsStubs.copyFileSync.secondCall.args).to.deep.equal([
        join('/input', 'src', 'translations', 'en.json'), join('/output', 'translations', 'en.json')
      ])
      expect(fsStubs.copyFileSync.thirdCall.args).to.deep.equal([
        join('/input', 'src', 'translations', 'vi.json'), join('/output', 'translations', 'vi.json')
      ])
    })

    it('should skip OS metadata files when copying assets', async () => {
      const inputPath = '/input'
      const outputPath = '/output'

      fsStubs.existsSync
        .withArgs(sinon.match.string).returns(false) // default
        .withArgs(sinon.match(/input.*assets/)).returns(true)

      fsStubs.readdirSync
        .withArgs(sinon.match(/input.*assets/)).returns(['logo.svg', '.DS_Store', '._logo.svg', '__MACOSX'])

      fsStubs.statSync
        .withArgs(sinon.match(/logo\.svg/)).returns({ isDirectory: () => false })

      fsStubs.mkdirSync.returns(undefined)
      fsStubs.copyFileSync.returns(undefined)

      const config = ViteConfigBuilder.createConfig({
        inputPath,
        outputPath
      })

      const assetPlugin = config.build.rollupOptions.plugins.find(
        (p: any) => p.name === 'copy-assets-translations'
      )

      const infoSpy = sinon.spy()
      await assetPlugin.writeBundle.call({ info: infoSpy })

      expect(fsStubs.copyFileSync.calledOnce).to.be.true
      expect(fsStubs.copyFileSync.firstCall.args).to.deep.equal([
        join('/input', 'src', 'assets', 'logo.svg'), join('/output', 'assets', 'logo.svg')
      ])
    })

    it('should log skipped system files through the plugin context with relative paths', async () => {
      const inputPath = '/input'
      const outputPath = '/output'

      fsStubs.existsSync
        .withArgs(sinon.match.string).returns(false) // default
        .withArgs(sinon.match(/input.*assets/)).returns(true)

      fsStubs.readdirSync
        .withArgs(sinon.match(/input.*assets/)).returns(['logo.svg', '.DS_Store'])

      fsStubs.statSync
        .withArgs(sinon.match(/logo\.svg/)).returns({ isDirectory: () => false })

      fsStubs.mkdirSync.returns(undefined)
      fsStubs.copyFileSync.returns(undefined)

      const config = ViteConfigBuilder.createConfig({
        inputPath,
        outputPath
      })

      const assetPlugin = config.build.rollupOptions.plugins.find(
        (p: any) => p.name === 'copy-assets-translations'
      )

      const infoSpy = sinon.spy()
      await assetPlugin.writeBundle.call({ info: infoSpy })

      expect(infoSpy.calledOnce).to.be.true
      expect(infoSpy.firstCall.args[0]).to.equal(`Skipping system file: ${join('src', 'assets', '.DS_Store')}`)
    })

    it('should warn and skip unexpected files not in the bundle contract', async () => {
      const inputPath = '/input'
      const outputPath = '/output'

      fsStubs.existsSync
        .withArgs(sinon.match.string).returns(false) // default
        .withArgs(sinon.match(/input.*assets/)).returns(true)
        .withArgs(sinon.match(/input.*translations/)).returns(true)

      fsStubs.readdirSync
        .withArgs(sinon.match(/input.*assets/)).returns(['logo.svg', 'icon.png', 'Thumbs.db', 'subdir'])
        .withArgs(sinon.match(/input.*translations/)).returns(['en.json', 'notes.txt'])

      fsStubs.statSync
        .withArgs(sinon.match(/logo\.svg/)).returns({ isDirectory: () => false })
        .withArgs(sinon.match(/icon\.png/)).returns({ isDirectory: () => false })
        .withArgs(sinon.match(/Thumbs\.db/)).returns({ isDirectory: () => false })
        .withArgs(sinon.match(/subdir/)).returns({ isDirectory: () => true })
        .withArgs(sinon.match(/en\.json/)).returns({ isDirectory: () => false })
        .withArgs(sinon.match(/notes\.txt/)).returns({ isDirectory: () => false })

      fsStubs.mkdirSync.returns(undefined)
      fsStubs.copyFileSync.returns(undefined)

      const config = ViteConfigBuilder.createConfig({
        inputPath,
        outputPath
      })

      const assetPlugin = config.build.rollupOptions.plugins.find(
        (p: any) => p.name === 'copy-assets-translations'
      )

      const warnSpy = sinon.spy()
      await assetPlugin.writeBundle.call({ warn: warnSpy })

      // Only contract files are copied
      expect(fsStubs.copyFileSync.calledTwice).to.be.true
      expect(fsStubs.copyFileSync.firstCall.args).to.deep.equal([
        join('/input', 'src', 'assets', 'logo.svg'), join('/output', 'assets', 'logo.svg')
      ])
      expect(fsStubs.copyFileSync.secondCall.args).to.deep.equal([
        join('/input', 'src', 'translations', 'en.json'), join('/output', 'translations', 'en.json')
      ])

      // Every unexpected entry (other files and subdirectories) is warned about
      expect(warnSpy.callCount).to.equal(4)
      expect(warnSpy.getCall(0).args[0]).to.equal(
        `Skipping unexpected file not in the connector bundle contract: ${join('src', 'assets', 'icon.png')}`)
      expect(warnSpy.getCall(1).args[0]).to.equal(
        `Skipping unexpected file not in the connector bundle contract: ${join('src', 'assets', 'Thumbs.db')}`)
      expect(warnSpy.getCall(2).args[0]).to.equal(
        `Skipping unexpected file not in the connector bundle contract: ${join('src', 'assets', 'subdir')}`)
      expect(warnSpy.getCall(3).args[0]).to.equal(
        `Skipping unexpected file not in the connector bundle contract: ${join('src', 'translations', 'notes.txt')}`)
    })

    it('should copy settings.json from src to the output root', async () => {
      const inputPath = '/input'
      const outputPath = '/output'

      fsStubs.existsSync.returns(false) // default
      fsStubs.existsSync
        .withArgs(join(inputPath, 'src', 'settings.json')).returns(true)

      const config = ViteConfigBuilder.createConfig({
        inputPath,
        outputPath
      })

      const assetPlugin = config.build.rollupOptions.plugins.find(
        (p: any) => p.name === 'copy-assets-translations'
      )

      await assetPlugin.writeBundle()

      expect(fsStubs.copyFileSync.calledOnce).to.be.true
      expect(fsStubs.copyFileSync.firstCall.args).to.deep.equal([
        join('/input', 'src', 'settings.json'), join('/output', 'settings.json')
      ])
    })

    it('should not copy settings.json if the file does not exist', async () => {
      const inputPath = '/input'
      const outputPath = '/output'

      fsStubs.existsSync.returns(false)

      const config = ViteConfigBuilder.createConfig({
        inputPath,
        outputPath
      })

      const assetPlugin = config.build.rollupOptions.plugins.find(
        (p: any) => p.name === 'copy-assets-translations'
      )

      await assetPlugin.writeBundle()

      expect(fsStubs.copyFileSync.called).to.be.false
    })

    it('should not inspect the filesystem for entries outside the bundle contract', async () => {
      const inputPath = '/input'
      const outputPath = '/output'

      fsStubs.existsSync
        .withArgs(sinon.match.string).returns(false)
        .withArgs(sinon.match(/input.*assets/)).returns(true)

      // Only disallowed entries: no statSync (dangling symlinks must not
      // abort the build before the allowlist rejects them by name)
      fsStubs.readdirSync
        .withArgs(sinon.match(/input.*assets/)).returns(['icon.png', 'Thumbs.db'])

      const config = ViteConfigBuilder.createConfig({ inputPath, outputPath })
      const copyPlugin = config.build.rollupOptions.plugins.find(
        (p: any) => p.name === 'copy-assets-translations')

      const warnSpy = sinon.spy()
      copyPlugin.writeBundle.call({ info: sinon.spy(), warn: warnSpy })

      expect(fsStubs.statSync.called).to.be.false
      expect(warnSpy.calledTwice).to.be.true
      expect(fsStubs.copyFileSync.called).to.be.false
    })

    it('should configure a clean, connector-scoped output directory', () => {
      const config = ViteConfigBuilder.createConfig({
        inputPath: '/input',
        outputPath: '/input/dist'
      })

      // outDir is internal to the connector root and deliberately emptied,
      // so stale files from previous builds cannot survive into the bundle
      expect(config.root).to.equal('/input')
      expect(config.build.emptyOutDir).to.equal(true)
      expect(config.configFile).to.equal(false)
      expect(config.publicDir).to.equal(false)
      expect(config.envDir).to.equal(false)
    })

    it('should not copy assets or translations if directories do not exist', async () => {
      const inputPath = '/input'
      const outputPath = '/output'

      fsStubs.existsSync.returns(false)

      const config = ViteConfigBuilder.createConfig({
        inputPath,
        outputPath
      })

      const assetPlugin = config.build.rollupOptions.plugins.find(
        (p: any) => p.name === 'copy-assets-translations'
      )

      await assetPlugin.writeBundle()

      expect(fsStubs.copyFileSync.called).to.be.false
    })
  })

  describe('createManifestPlugin', () => {
    it('should generate manifest and copy to target directory in development mode', async () => {
      const outputPath = '/output'
      const targetDir = '/target'

      manifestStub.resolves()

      fsStubs.existsSync
        .withArgs(sinon.match.string).returns(false) // default
        .withArgs(sinon.match(/output/)).returns(true)

      fsStubs.readdirSync.withArgs(sinon.match(/output/)).returns(['manifest.json', 'connector.js'])
      fsStubs.statSync
        .withArgs(sinon.match(/manifest\.json/)).returns({ isDirectory: () => false })
        .withArgs(sinon.match(/connector\.js/)).returns({ isDirectory: () => false })

      fsStubs.mkdirSync.returns(undefined)
      fsStubs.copyFileSync.returns(undefined)

      const config = ViteConfigBuilder.createConfig({
        inputPath: '/input',
        outputPath,
        mode: 'development',
        targetDir
      })

      const manifestPlugin = config.build.rollupOptions.plugins.find(
        (p: any) => p.name === 'generate-manifest'
      )

      await manifestPlugin.writeBundle()
      expect(manifestStub.calledOnce).to.be.true
      expect(manifestStub.firstCall.args).to.deep.equal([
        { outputPath }
      ])

      expect(fsStubs.mkdirSync.called).to.be.true
      expect(fsStubs.mkdirSync.firstCall.args).to.deep.equal([
        targetDir, { recursive: true }
      ])

      expect(fsStubs.copyFileSync.called).to.be.true
      expect(fsStubs.copyFileSync.firstCall.args).to.deep.equal([
        join('/output', 'manifest.json'), join('/target', 'manifest.json')
      ])
      expect(fsStubs.copyFileSync.secondCall.args).to.deep.equal([
        join('/output', 'connector.js'), join('/target', 'connector.js')
      ])
    })

    it('should handle manifest generation error', async () => {
      const error = new Error('Manifest generation failed')
      manifestStub.rejects(error)

      const config = ViteConfigBuilder.createConfig({
        inputPath: '/input',
        outputPath: '/output'
      })

      const manifestPlugin = config.build.rollupOptions.plugins.find(
        (p: any) => p.name === 'generate-manifest'
      )

      try {
        await manifestPlugin.writeBundle()
        expect.fail('Should have thrown error')
      } catch (e) {
        expect(e).to.equal(error)
        expect(consoleErrorStub.called).to.be.true
        expect(consoleErrorStub.firstCall.args).to.deep.equal(['Failed to generate manifest:', error])
      }
    })

    it('should generate manifest without copying in production mode', async () => {
      manifestStub.resolves()

      const outputPath = '/output'
      const config = ViteConfigBuilder.createConfig({
        inputPath: '/input',
        outputPath,
        mode: 'production'
      })

      const manifestPlugin = config.build.rollupOptions.plugins.find(
        (p: any) => p.name === 'generate-manifest'
      )

      await manifestPlugin.writeBundle()

      expect(manifestStub.calledOnce).to.be.true
      expect(manifestStub.firstCall.args).to.deep.equal([
        { outputPath }
      ])
      expect(fsStubs.mkdirSync.called).to.be.false
      expect(fsStubs.copyFileSync.called).to.be.false
    })

    it('should skip copying if no targetDir specified in development mode', async () => {
      manifestStub.resolves()

      const config = ViteConfigBuilder.createConfig({
        inputPath: '/input',
        outputPath: '/output',
        mode: 'development'
        // no targetDir
      })

      const manifestPlugin = config.build.rollupOptions.plugins.find(
        (p: any) => p.name === 'generate-manifest'
      )

      await manifestPlugin.writeBundle()

      expect(manifestStub.calledOnce).to.be.true
      expect(fsStubs.mkdirSync.called).to.be.false
      expect(fsStubs.copyFileSync.called).to.be.false
    })
  })

  describe('createArchivePlugin', () => {
    it('should create a versioned archive beside the output directory', async () => {
      const readFileStub = sinon.stub(fs.promises, 'readFile').resolves(JSON.stringify({
        name: 'my-connector',
        version: '1.2.3'
      }))
      const createPackageArchiveStub = sinon.stub(publishModule, 'createPackageArchive').resolves('/connector/my-connector-1.2.3.zip')

      const config = ViteConfigBuilder.createConfig({
        inputPath: '/connector',
        outputPath: '/connector/dist',
        archiveOutputPath: '/connector'
      })

      const archivePlugin = config.build.rollupOptions.plugins.find(
        (p: any) => p.name === 'create-connector-archive'
      )

      await archivePlugin.writeBundle.handler()

      expect(readFileStub.calledWith(join('/connector/dist', 'manifest.json'), 'utf-8')).to.be.true
      expect(createPackageArchiveStub.calledWith('/connector/dist', 'my-connector-1.2.3', '/connector')).to.be.true
    })

    it('should reject manifest names containing path separators', async () => {
      sinon.stub(fs.promises, 'readFile').resolves(JSON.stringify({
        name: '/tmp/my-connector',
        version: '1.2.3'
      }))
      const createPackageArchiveStub = sinon.stub(publishModule, 'createPackageArchive').resolves('/unused')

      const config = ViteConfigBuilder.createConfig({
        inputPath: '/connector',
        outputPath: '/connector/dist',
        archiveOutputPath: '/connector'
      })

      const archivePlugin = config.build.rollupOptions.plugins.find(
        (p: any) => p.name === 'create-connector-archive'
      )

      try {
        await archivePlugin.writeBundle.handler()
        expect.fail('should have thrown')
      } catch (error: any) {
        expect(error.message).to.include('must not contain path separators')
      }
      expect(createPackageArchiveStub.called).to.be.false
    })
  })

  describe('external function', () => {
    const getExternal = () =>
      ViteConfigBuilder.createConfig({
        inputPath: '/input',
        outputPath: '/output'
      }).build.rollupOptions.external

    it('should bundle relative imports', () => {
      const external = getExternal()
      expect(external('./foo')).to.be.false
      expect(external('../foo/bar')).to.be.false
    })

    it('should bundle posix absolute paths', () => {
      const external = getExternal()
      expect(external('/Users/dev/project/src/index.ts')).to.be.false
    })

    // Rollup normalizes ids to forward slashes even on Windows, so the entry
    // arrives as e.g. C:/.../src/index.ts. isAbsolute (win32) must classify it
    // as local so it is bundled, not treated as external. Regression for the
    // "Entry module ... cannot be external" Windows bundle failure.
    const winIt = process.platform === 'win32' ? it : it.skip
    winIt('should bundle windows absolute paths (forward-slash normalized)', () => {
      const external = getExternal()
      expect(external('C:/Users/dev/project/src/index.ts')).to.be.false
      expect(external('C:\\Users\\dev\\project\\src\\index.ts')).to.be.false
    })

    it('should treat bare module specifiers as external', () => {
      const external = getExternal()
      expect(external('lodash')).to.be.true
      expect(external('lodash/get')).to.be.true
    })

    it('should always bundle @zendesk/connector-sdk', () => {
      const external = getExternal()
      expect(external('@zendesk/connector-sdk')).to.be.false
      expect(external('@zendesk/connector-sdk/dist/index.js')).to.be.false
    })
  })

  describe('recursive directory copying', () => {
    it('should handle nested directories when copying to target directory', async () => {
      const outputPath = '/output'
      const targetDir = '/target'

      manifestStub.resolves()

      fsStubs.existsSync
        .withArgs(sinon.match.string).returns(false) // default
        .withArgs(sinon.match(/output/)).returns(true)

      fsStubs.readdirSync
        .withArgs(sinon.match(/output/)).returns(['subdir', 'file.js'])
        .withArgs(sinon.match(/subdir/)).returns(['nested.js'])

      fsStubs.statSync
        .withArgs(sinon.match(/subdir/)).returns({ isDirectory: () => true })
        .withArgs(sinon.match(/file\.js/)).returns({ isDirectory: () => false })
        .withArgs(sinon.match(/nested\.js/)).returns({ isDirectory: () => false })

      fsStubs.mkdirSync.returns(undefined)
      fsStubs.copyFileSync.returns(undefined)

      const config = ViteConfigBuilder.createConfig({
        inputPath: '/input',
        outputPath,
        mode: 'development',
        targetDir
      })

      const manifestPlugin = config.build.rollupOptions.plugins.find(
        (p: any) => p.name === 'generate-manifest'
      )

      await manifestPlugin.writeBundle()

      expect(fsStubs.mkdirSync.called).to.be.true
      expect(fsStubs.mkdirSync.firstCall.args).to.deep.equal([
        targetDir, { recursive: true }
      ])
      expect(fsStubs.mkdirSync.secondCall.args).to.deep.equal([
        targetDir, { recursive: true }
      ])
      expect(fsStubs.mkdirSync.thirdCall.args).to.deep.equal([
        join(targetDir, 'subdir'), { recursive: true }
      ])

      expect(fsStubs.copyFileSync.called).to.be.true
      expect(fsStubs.copyFileSync.firstCall.args).to.deep.equal([
        join('/output', 'subdir', 'nested.js'), join('/target', 'subdir', 'nested.js')
      ])
      expect(fsStubs.copyFileSync.secondCall.args).to.deep.equal([
        join('/output', 'file.js'), join('/target', 'file.js')
      ])
    })
  })
})

// Real-filesystem tests for symlink handling in the contract copy. These run
// outside the stubbed describe above so fs calls hit a real temp directory.
describe('createAssetCopyPlugin symlink handling (real filesystem)', () => {
  const posixIt = process.platform === 'win32' ? it.skip : it

  let connectorDir: string
  let outputPath: string

  beforeEach(() => {
    connectorDir = fs.mkdtempSync(join(os.tmpdir(), 'zcli-symlink-test-'))
    outputPath = join(connectorDir, 'dist')
    fs.mkdirSync(join(connectorDir, 'src', 'assets'), { recursive: true })
  })

  afterEach(() => {
    fs.rmSync(connectorDir, { recursive: true, force: true })
  })

  const runCopyPlugin = (loggers: { info: sinon.SinonSpy, warn: sinon.SinonSpy }) => {
    const config = ViteConfigBuilder.createConfig({ inputPath: connectorDir, outputPath })
    const copyPlugin = config.build.rollupOptions.plugins.find(
      (p: any) => p.name === 'copy-assets-translations')
    copyPlugin.writeBundle.call(loggers)
  }

  posixIt('should warn and skip a dangling symlink outside the bundle contract', () => {
    fs.writeFileSync(join(connectorDir, 'src', 'assets', 'logo.svg'), '<svg/>')
    fs.symlinkSync(
      join(connectorDir, 'src', 'assets', 'missing-target'),
      join(connectorDir, 'src', 'assets', 'icon.svg'))

    const loggers = { info: sinon.spy(), warn: sinon.spy() }

    expect(() => runCopyPlugin(loggers)).to.not.throw()
    expect(loggers.warn.calledOnce).to.be.true
    expect(loggers.warn.firstCall.args[0]).to.include(join('src', 'assets', 'icon.svg'))
    expect(fs.existsSync(join(outputPath, 'assets', 'logo.svg'))).to.be.true
    expect(fs.existsSync(join(outputPath, 'assets', 'icon.svg'))).to.be.false
  })

  posixIt('should fail clearly for a dangling symlink to a contract file', () => {
    // logo.svg is in the contract, so a broken one is a real authoring error
    fs.symlinkSync(
      join(connectorDir, 'src', 'assets', 'missing-target'),
      join(connectorDir, 'src', 'assets', 'logo.svg'))

    const loggers = { info: sinon.spy(), warn: sinon.spy() }

    expect(() => runCopyPlugin(loggers)).to.throw(/ENOENT|no such file/)
  })
})
