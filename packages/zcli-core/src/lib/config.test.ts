import { expect, test } from '@oclif/test'
import * as fs from 'fs-extra'
import * as sinon from 'sinon'
import Config from './config'

describe('Config', () => {
  describe('ensureConfigFile', () => {
    let outputJsonStub: sinon.SinonStub

    beforeEach(() => {
      outputJsonStub = sinon.stub(fs, 'outputJson').resolves()
    })

    afterEach(() => {
      sinon.restore()
    })

    test
      .stub(fs, 'pathExists', () => Promise.resolve(true))
      .it('should not create file, if file exists', async () => {
        const config = new Config()
        await config.ensureConfigFile()
        expect(outputJsonStub.called).to.equal(false)
      })

    test
      .stub(fs, 'pathExists', () => Promise.resolve(false))
      .it('should create file, if file does not exists', async () => {
        const config = new Config()
        await config.ensureConfigFile()
        expect(outputJsonStub.called).to.equal(true)
      })
  })

  describe('getConfig', () => {
    const mockConfig = { foo: 'bar' }

    test
      .stub(fs, 'pathExists', () => Promise.resolve(true))
      .stub(fs, 'readJson', () => Promise.resolve(mockConfig))
      .it('should read file and return config key', async () => {
        const config = new Config()
        expect(await config.getConfig('foo')).to.equal('bar')
      })

    test
      .stub(fs, 'pathExists', () => Promise.resolve(true))
      .stub(fs, 'readJson', () => Promise.resolve())
      .it('should read file and return undefined if key not found', async () => {
        const config = new Config()
        expect(await config.getConfig('zoo')).to.equal(undefined)
      })
  })

  describe('setConfig', () => {
    let mockConfig: object = { foo: 'bar' }

    test
      .stub(fs, 'pathExists', () => Promise.resolve(true))
      .stub(fs, 'readJson', () => Promise.resolve(mockConfig))
      .stub(fs, 'outputJson', (...args) => {
        mockConfig = (args as object[])[1]
        return Promise.resolve()
      })
      .it('should update config with new key value', async () => {
        const config = new Config()
        await config.setConfig('zoo', 'baz')
        expect(mockConfig).to.deep.equal({ foo: 'bar', zoo: 'baz' })
      })
  })

  describe('removeConfig', () => {
    let mockConfig: object = { foo: 'bar', zoo: 'baz' }

    test
      .stub(fs, 'pathExists', () => Promise.resolve(true))
      .stub(fs, 'readJson', () => Promise.resolve(mockConfig))
      .stub(fs, 'outputJson', (...args) => {
        mockConfig = (args as object[])[1]
        return Promise.resolve()
      })
      .it('should remove key value from config', async () => {
        const config = new Config()
        await config.removeConfig('foo')
        expect(mockConfig).to.deep.equal({ zoo: 'baz' })
      })
  })
})
