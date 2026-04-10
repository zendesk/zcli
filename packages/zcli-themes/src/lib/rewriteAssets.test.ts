import * as sinon from 'sinon'
import * as fs from 'fs'
import { expect } from '@oclif/test'
import rewriteAssets from './rewriteAssets'

describe('rewriteAssets', () => {
  beforeEach(() => {
    sinon.restore()
  })

  it('decodes base64 content and writes assets to the correct file paths', () => {
    const mkdirSyncStub = sinon.stub(fs, 'mkdirSync')
    const writeFileSyncStub = sinon.stub(fs, 'writeFileSync')

    const jsContent = Buffer.from('console.log("hello")').toString('base64')

    rewriteAssets('theme/path', {
      'script.js': jsContent
    })

    expect(mkdirSyncStub.calledOnce).to.equal(true)
    expect(mkdirSyncStub.firstCall.args[1]).to.deep.equal({ recursive: true })

    expect(writeFileSyncStub.callCount).to.equal(1)
    expect(writeFileSyncStub.firstCall.args[0]).to.equal('theme/path/assets/script.js')
    expect(Buffer.compare(
      writeFileSyncStub.firstCall.args[1] as Buffer,
      Buffer.from('console.log("hello")')
    )).to.equal(0)
  })

  it('handles multiple file types', () => {
    sinon.stub(fs, 'mkdirSync')
    const writeFileSyncStub = sinon.stub(fs, 'writeFileSync')

    const jsContent = Buffer.from('var a = 1;').toString('base64')
    const pngContent = Buffer.from([0x89, 0x50, 0x4e, 0x47]).toString('base64')

    rewriteAssets('theme/path', {
      'app.js': jsContent,
      'logo.png': pngContent
    })

    expect(writeFileSyncStub.callCount).to.equal(2)
    expect(writeFileSyncStub.firstCall.args[0]).to.equal('theme/path/assets/app.js')
    expect(writeFileSyncStub.secondCall.args[0]).to.equal('theme/path/assets/logo.png')

    expect(Buffer.compare(
      writeFileSyncStub.secondCall.args[1] as Buffer,
      Buffer.from([0x89, 0x50, 0x4e, 0x47])
    )).to.equal(0)
  })

  it('handles empty assets object', () => {
    sinon.stub(fs, 'mkdirSync')
    const writeFileSyncStub = sinon.stub(fs, 'writeFileSync')

    rewriteAssets('theme/path', {})

    expect(writeFileSyncStub.callCount).to.equal(0)
  })

  it('throws an error when file cannot be written', () => {
    sinon.stub(fs, 'mkdirSync')
    const writeFileSyncStub = sinon.stub(fs, 'writeFileSync')

    writeFileSyncStub.throws(new Error('Permission denied'))

    const jsContent = Buffer.from('first').toString('base64')

    expect(() => {
      rewriteAssets('theme/path', { 'a.js': jsContent })
    }).to.throw('Failed to write asset file: theme/path/assets/a.js')
  })

  it('throws an error when assets directory cannot be created', () => {
    sinon.stub(fs, 'mkdirSync').throws(new Error('Permission denied'))
    sinon.stub(fs, 'writeFileSync')

    const jsContent = Buffer.from('hello').toString('base64')

    expect(() => {
      rewriteAssets('theme/path', { 'a.js': jsContent })
    }).to.throw('Failed to create assets directory: theme/path/assets')
  })
})
