/* eslint-disable @typescript-eslint/no-explicit-any */

import { expect } from 'chai'
import * as sinon from 'sinon'
import * as fs from 'fs'
import { validateAssets } from './assetsValidation'
import type { ValidationContext } from './index'

describe('validateAssets', () => {
  let existsSyncStub: sinon.SinonStub
  let readdirSyncStub: sinon.SinonStub
  let statSyncStub: sinon.SinonStub
  let logSpy: sinon.SinonSpy

  beforeEach(() => {
    existsSyncStub = sinon.stub(fs, 'existsSync')
    readdirSyncStub = sinon.stub(fs, 'readdirSync')
    statSyncStub = sinon.stub(fs, 'statSync')
    logSpy = sinon.spy()
  })

  afterEach(() => {
    sinon.restore()
  })

  describe('successful validation', () => {
    it('should pass validation when logo.svg exists with correct name and size', async () => {
      existsSyncStub.returns(true)
      readdirSyncStub.returns(['logo.svg'] as any)
      statSyncStub.returns({
        isDirectory: () => false,
        size: 2048
      } as any)

      const context: ValidationContext = {
        inputPath: '/path/to/dist',
        options: { verbose: false },
        log: logSpy
      }

      await validateAssets(context)

      expect(logSpy.called).to.equal(false)
    })

    it('should log validation messages when verbose mode is enabled', async () => {
      existsSyncStub.returns(true)
      readdirSyncStub.returns(['logo.svg'] as any)
      statSyncStub.returns({
        isDirectory: () => false,
        size: 2048
      } as any)

      const context: ValidationContext = {
        inputPath: '/path/to/dist',
        options: { verbose: true },
        log: logSpy
      }

      await validateAssets(context)

      expect(logSpy.callCount).to.equal(4)
      expect(logSpy.getCall(0).args[0]).to.include('Validating assets and resources')
      expect(logSpy.getCall(1).args[0]).to.include('Found')
      expect(logSpy.getCall(2).args[0]).to.include('Logo file validated')
      expect(logSpy.getCall(3).args[0]).to.include('Assets and resources validation passed')
    })

    it('should not validate assets if assets directory does not exist', async () => {
      existsSyncStub.returns(false)

      const context: ValidationContext = {
        inputPath: '/path/to/dist',
        options: { verbose: false },
        log: logSpy
      }

      await validateAssets(context)

      expect(logSpy.called).to.equal(false)
    })
  })

  describe('validation failures', () => {
    it('should throw error when assets directory is empty', async () => {
      existsSyncStub.returns(true)
      readdirSyncStub.returns([] as any)

      const context: ValidationContext = {
        inputPath: '/path/to/dist',
        options: { verbose: false },
        log: logSpy
      }

      try {
        await validateAssets(context)
        expect.fail('Should have thrown an error')
      } catch (error) {
        expect((error as Error).message).to.include('Assets validation failed')
        expect((error as Error).message).to.include('must contain a logo file')
      }
    })

    it('should throw error when multiple files exist in assets directory', async () => {
      existsSyncStub.returns(true)
      readdirSyncStub.returns(['logo.svg', 'extra.svg'] as any)
      statSyncStub.returns({
        isDirectory: () => false,
        size: 2048
      } as any)

      const context: ValidationContext = {
        inputPath: '/path/to/dist',
        options: { verbose: false },
        log: logSpy
      }

      try {
        await validateAssets(context)
        expect.fail('Should have thrown an error')
      } catch (error) {
        expect((error as Error).message).to.include('Assets validation failed')
        expect((error as Error).message).to.include('only one logo file')
        expect((error as Error).message).to.include('found 2 files')
      }
    })

    it('should throw error when file has unsupported extension', async () => {
      existsSyncStub.returns(true)
      readdirSyncStub.returns(['logo.png'] as any)
      statSyncStub.returns({
        isDirectory: () => false,
        size: 2048
      } as any)

      const context: ValidationContext = {
        inputPath: '/path/to/dist',
        options: { verbose: false },
        log: logSpy
      }

      try {
        await validateAssets(context)
        expect.fail('Should have thrown an error')
      } catch (error) {
        expect((error as Error).message).to.include('Assets validation failed')
        expect((error as Error).message).to.include('unsupported extension')
        expect((error as Error).message).to.include('.png')
      }
    })

    it('should throw error when logo filename is incorrect', async () => {
      existsSyncStub.returns(true)
      readdirSyncStub.returns(['icon.svg'] as any)
      statSyncStub.returns({
        isDirectory: () => false,
        size: 2048
      } as any)

      const context: ValidationContext = {
        inputPath: '/path/to/dist',
        options: { verbose: false },
        log: logSpy
      }

      try {
        await validateAssets(context)
        expect.fail('Should have thrown an error')
      } catch (error) {
        expect((error as Error).message).to.include('Assets validation failed')
        expect((error as Error).message).to.include("must be named 'logo'")
        expect((error as Error).message).to.include('icon.svg')
      }
    })

    it('should throw error when logo file exceeds max size (5KB)', async () => {
      existsSyncStub.returns(true)
      readdirSyncStub.returns(['logo.svg'] as any)
      statSyncStub.returns({
        isDirectory: () => false,
        size: 6144 // 6KB
      } as any)

      const context: ValidationContext = {
        inputPath: '/path/to/dist',
        options: { verbose: false },
        log: logSpy
      }

      try {
        await validateAssets(context)
        expect.fail('Should have thrown an error')
      } catch (error) {
        expect((error as Error).message).to.include('Assets validation failed')
        expect((error as Error).message).to.include('too large')
        expect((error as Error).message).to.include('5KB')
      }
    })

    it('should throw error when total assets size exceeds max (5KB)', async () => {
      existsSyncStub.returns(true)
      readdirSyncStub.returns(['logo.svg'] as any)
      statSyncStub.returns({
        isDirectory: () => false,
        size: 6144 // 6KB
      } as any)

      const context: ValidationContext = {
        inputPath: '/path/to/dist',
        options: { verbose: false },
        log: logSpy
      }

      try {
        await validateAssets(context)
        expect.fail('Should have thrown an error')
      } catch (error) {
        expect((error as Error).message).to.include('too large')
        expect((error as Error).message).to.include('5KB')
      }
    })
  })
})
