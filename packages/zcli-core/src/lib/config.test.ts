import { expect, test } from '@oclif/test'
import * as fs from 'fs-extra'
import * as sinon from 'sinon'
import Config from './config'

describe('Config', () => {
  describe('ensureConfigFile', () => {
    const outputJsonStub = sinon.stub(fs, 'outputJson').resolves()
    const config = new Config()

    beforeEach(() => outputJsonStub.reset())

    test
      .stub(fs, 'pathExists', () => Promise.resolve(true))
      .stub(fs, 'outputJson', () => outputJsonStub)
      .it('should not create file, if file exists', async () => {
        await config.ensureConfigFile()
        expect(outputJsonStub.called).to.equal(false)
      })

    test
      .stub(fs, 'pathExists', () => Promise.resolve(false))
      .it('should create file, if file does not exists', async () => {
        await config.ensureConfigFile()
        expect(outputJsonStub.called).to.equal(true)
      })
  })

  describe('getConfig', () => {
    const config = new Config()
    const mockConfig = { foo: 'bar' }

    test
      .stub(config, 'ensureConfigFile', () => Promise.resolve())
      .stub(fs, 'readJson', () => Promise.resolve(mockConfig))
      .it('should read file and return config key', async () => {
        expect(await config.getConfig('foo')).to.equal('bar')
      })

    test
      .stub(config, 'ensureConfigFile', () => Promise.resolve())
      .stub(fs, 'readJson', () => Promise.resolve())
      .it('should read file and return undefined if key not found', async () => {
        expect(await config.getConfig('zoo')).to.equal(undefined)
      })
  })

  describe('setConfig', () => {
    const config = new Config()
    let mockConfig: object = { foo: 'bar' }

    test
      .stub(config, 'ensureConfigFile', () => Promise.resolve())
      .stub(fs, 'readJson', () => Promise.resolve(mockConfig))
      .stub(fs, 'outputJson', (...args) => {
        mockConfig = (args as object[])[1]
      })
      .it('should update config with new key value', async () => {
        await config.setConfig('zoo', 'baz')
        expect(mockConfig).to.deep.equal({ foo: 'bar', zoo: 'baz' })
      })
  })

  describe('removeConfig', () => {
    const config = new Config()
    let mockConfig: object = { foo: 'bar', zoo: 'baz' }

    test
      .stub(config, 'ensureConfigFile', () => Promise.resolve())
      .stub(fs, 'readJson', () => Promise.resolve(mockConfig))
      .stub(fs, 'outputJson', (...args) => {
        mockConfig = (args as object[])[1]
      })
      .it('should remove key value from config', async () => {
        await config.removeConfig('foo')
        expect(mockConfig).to.deep.equal({ zoo: 'baz' })
      })
  })
})
