import * as sinon from 'sinon'
import * as fs from 'fs'
import { expect } from '@oclif/test'
import getAssets from './getAssets'

const flags = {
  bind: 'localhost',
  port: 1000,
  logs: true,
  livereload: true
}

describe('getAssets', () => {
  beforeEach(() => {
    sinon.restore()
  })

  it('returns an array of tuples containing the parsed path and url for each asset', () => {
    const existsSyncStub = sinon.stub(fs, 'existsSync')
    const readdirSyncStub = sinon.stub(fs, 'readdirSync')

    existsSyncStub
      .withArgs('theme/path/assets')
      .returns(true)

    readdirSyncStub.returns(['.gitkeep', 'foo.png', 'bar.png'] as unknown as fs.Dirent[])

    const assets = getAssets('theme/path', flags)

    expect(assets).to.deep.equal([
      [
        { base: 'foo.png', dir: '', ext: '.png', name: 'foo', root: '' },
        'http://localhost:1000/guide/assets/foo.png'
      ],
      [
        { base: 'bar.png', dir: '', ext: '.png', name: 'bar', root: '' },
        'http://localhost:1000/guide/assets/bar.png'
      ]
    ])
  })

  it('throws an error when an asset has illegal characters in its name', () => {
    const existsSyncStub = sinon.stub(fs, 'existsSync')
    const readdirSyncStub = sinon.stub(fs, 'readdirSync')

    existsSyncStub
      .withArgs('theme/path/assets')
      .returns(true)

    readdirSyncStub.returns(['unsuported file name.png'] as unknown as fs.Dirent[])

    expect(() => {
      getAssets('theme/path', flags)
    }).to.throw('The asset "unsuported file name.png" has illegal characters in its name. Filenames should only have alpha-numerical characters, ., _, -, and +')
  })
})
