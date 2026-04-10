/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable no-unused-expressions */
import { expect } from 'chai'
import * as sinon from 'sinon'
import * as fs from 'fs'
import { join } from 'path'
import { ViteConfigBuilder, createConnectorViteConfig } from './vite-config'
import { ManifestGenerator } from '../manifest-generator/generator'

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
        join('/output', 'assets', 'subdir'), { recursive: true }
      ])
      expect(fsStubs.mkdirSync.thirdCall.args).to.deep.equal([
        join('/output', 'translations'), { recursive: true }
      ])

      // Verify files were copied
      expect(fsStubs.copyFileSync.called).to.be.true
      expect(fsStubs.copyFileSync.firstCall.args).to.deep.equal([
        join('/input', 'src', 'assets', 'file1.png'), join('/output', 'assets', 'file1.png')
      ])
      expect(fsStubs.copyFileSync.secondCall.args).to.deep.equal([
        join('/input', 'src', 'assets', 'subdir', 'file2.png'), join('/output', 'assets', 'subdir', 'file2.png')
      ])
      expect(fsStubs.copyFileSync.thirdCall.args).to.deep.equal([
        join('/input', 'src', 'translations', 'en.json'), join('/output', 'translations', 'en.json')
      ])
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

  describe('createConnectorViteConfig helper function', () => {
    it('should create config using ViteConfigBuilder', () => {
      const options = {
        inputPath: '/input',
        outputPath: '/output'
      }

      const config = createConnectorViteConfig(options)

      expect(config).to.have.property('build')
      expect(config.build).to.have.property('lib')
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
