/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable no-unused-expressions */
import { expect, use } from 'chai'
import * as sinon from 'sinon'
import sinonChai from 'sinon-chai'
import * as fs from 'fs'
import { ViteConfigBuilder, createConnectorViteConfig } from './vite-config'
import { ManifestGenerator } from '../manifest-generator/generator'

use(sinonChai)

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

  describe('createAssetCopyPlugin', () => {
    it('should copy assets and translations when writeBundle is called', async () => {
      const inputPath = '/input'
      const outputPath = '/output'

      // Mock directory structure - use normalized paths
      fsStubs.existsSync
        .withArgs(sinon.match.string).returns(false) // default
        .withArgs(sinon.match(/input.*assets/)).returns(true)
        .withArgs(sinon.match(/input.*translations/)).returns(true)

      fsStubs.readdirSync
        .withArgs(sinon.match(/input.*assets/)).returns(['file1.png', 'subdir'])
        .withArgs(sinon.match(/input.*translations/)).returns(['en.json'])
        .withArgs(sinon.match(/input.*assets.*subdir/)).returns(['file2.png'])

      fsStubs.statSync
        .withArgs(sinon.match(/file1\.png/)).returns({ isDirectory: () => false })
        .withArgs(sinon.match(/subdir/)).returns({ isDirectory: () => true })
        .withArgs(sinon.match(/en\.json/)).returns({ isDirectory: () => false })
        .withArgs(sinon.match(/file2\.png/)).returns({ isDirectory: () => false })

      fsStubs.mkdirSync.returns(undefined)
      fsStubs.copyFileSync.returns(undefined)

      const config = ViteConfigBuilder.createConfig({
        useLocalWorkspace: true,
        inputPath,
        outputPath
      }, { log: () => {} })

      const assetPlugin = config.build.rollupOptions.plugins.find(
        (p: any) => p.name === 'copy-assets-translations'
      )

      // Execute writeBundle
      await assetPlugin.writeBundle()

      // Verify directories were created - use flexible path matching
      expect(fsStubs.mkdirSync).to.have.been.calledWith(sinon.match(/assets/), { recursive: true })
      expect(fsStubs.mkdirSync).to.have.been.calledWith(sinon.match(/translations/), { recursive: true })
      expect(fsStubs.mkdirSync).to.have.been.calledWith(sinon.match(/assets.*subdir/), { recursive: true })

      // Verify files were copied
      expect(fsStubs.copyFileSync).to.have.been.calledWith(sinon.match(/file1\.png/), sinon.match(/file1\.png/))
      expect(fsStubs.copyFileSync).to.have.been.calledWith(sinon.match(/en\.json/), sinon.match(/en\.json/))
      expect(fsStubs.copyFileSync).to.have.been.calledWith(sinon.match(/file2\.png/), sinon.match(/file2\.png/))
    })

    it('should not copy assets or translations if directories do not exist', async () => {
      const inputPath = '/input'
      const outputPath = '/output'

      fsStubs.existsSync.returns(false)

      const config = ViteConfigBuilder.createConfig({
        useLocalWorkspace: true,
        inputPath,
        outputPath
      }, { log: () => {} })

      const assetPlugin = config.build.rollupOptions.plugins.find(
        (p: any) => p.name === 'copy-assets-translations'
      )

      await assetPlugin.writeBundle()

      expect(fsStubs.copyFileSync).not.to.have.been.called
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
        useLocalWorkspace: true,
        inputPath: '/input',
        outputPath,
        mode: 'development',
        targetDir
      }, { log: () => {} })

      const manifestPlugin = config.build.rollupOptions.plugins.find(
        (p: any) => p.name === 'generate-manifest'
      )

      await manifestPlugin.writeBundle()

      expect(manifestStub).to.have.been.calledWith({ outputPath })
      expect(fsStubs.mkdirSync).to.have.been.calledWith(sinon.match(/target/), { recursive: true })
      expect(fsStubs.copyFileSync).to.have.been.calledWith(sinon.match(/manifest\.json/), sinon.match(/manifest\.json/))
      expect(fsStubs.copyFileSync).to.have.been.calledWith(sinon.match(/connector\.js/), sinon.match(/connector\.js/))
    })

    it('should handle manifest generation error', async () => {
      const error = new Error('Manifest generation failed')
      manifestStub.rejects(error)

      const config = ViteConfigBuilder.createConfig({
        useLocalWorkspace: true,
        inputPath: '/input',
        outputPath: '/output'
      }, { log: () => {} })

      const manifestPlugin = config.build.rollupOptions.plugins.find(
        (p: any) => p.name === 'generate-manifest'
      )

      try {
        await manifestPlugin.writeBundle()
        expect.fail('Should have thrown error')
      } catch (e) {
        expect(e).to.equal(error)
        expect(consoleErrorStub).to.have.been.calledWith('Failed to generate manifest:', error)
      }
    })

    it('should generate manifest without copying in production mode', async () => {
      manifestStub.resolves()

      const config = ViteConfigBuilder.createConfig({
        useLocalWorkspace: true,
        inputPath: '/input',
        outputPath: '/output',
        mode: 'production'
      }, { log: () => {} })

      const manifestPlugin = config.build.rollupOptions.plugins.find(
        (p: any) => p.name === 'generate-manifest'
      )

      await manifestPlugin.writeBundle()

      expect(manifestStub).to.have.been.calledWith({ outputPath: '/output' })
      expect(fsStubs.mkdirSync).not.to.have.been.called
      expect(fsStubs.copyFileSync).not.to.have.been.called
    })

    it('should skip copying if no targetDir specified in development mode', async () => {
      manifestStub.resolves()

      const config = ViteConfigBuilder.createConfig({
        useLocalWorkspace: true,
        inputPath: '/input',
        outputPath: '/output',
        mode: 'development'
        // no targetDir
      }, { log: () => {} })

      const manifestPlugin = config.build.rollupOptions.plugins.find(
        (p: any) => p.name === 'generate-manifest'
      )

      await manifestPlugin.writeBundle()

      expect(manifestStub).to.have.been.called
      expect(fsStubs.mkdirSync).not.to.have.been.called
      expect(fsStubs.copyFileSync).not.to.have.been.called
    })
  })

  describe('createConnectorViteConfig helper function', () => {
    it('should create config using ViteConfigBuilder', () => {
      const options = {
        useLocalWorkspace: true,
        inputPath: '/input',
        outputPath: '/output'
      }
      const logger = { log: sinon.stub() }

      const config = createConnectorViteConfig(options, logger)

      expect(config).to.have.property('build')
      expect(config.build).to.have.property('lib')
      expect(logger.log).to.have.been.calledWith('[ViteConfigBuilder] Using local workspace configuration')
    })

    it('should create npm config when useLocalWorkspace is false', () => {
      const options = {
        useLocalWorkspace: false,
        inputPath: '/input',
        outputPath: '/output'
      }
      const logger = { log: sinon.stub() }

      const config = createConnectorViteConfig(options, logger)

      expect(config).to.have.property('build')
      expect(logger.log).to.have.been.calledWith('[ViteConfigBuilder] Using npm registry configuration (default)')
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
        useLocalWorkspace: true,
        inputPath: '/input',
        outputPath,
        mode: 'development',
        targetDir
      }, { log: () => {} })

      const manifestPlugin = config.build.rollupOptions.plugins.find(
        (p: any) => p.name === 'generate-manifest'
      )

      await manifestPlugin.writeBundle()

      expect(fsStubs.mkdirSync).to.have.been.calledWith(sinon.match(/target/), { recursive: true })
      expect(fsStubs.mkdirSync).to.have.been.calledWith(sinon.match(/target.*subdir/), { recursive: true })
      expect(fsStubs.copyFileSync).to.have.been.calledWith(sinon.match(/file\.js/), sinon.match(/file\.js/))
      expect(fsStubs.copyFileSync).to.have.been.calledWith(sinon.match(/nested\.js/), sinon.match(/nested\.js/))
    })
  })
})
