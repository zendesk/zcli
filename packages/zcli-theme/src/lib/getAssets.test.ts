import * as sinon from 'sinon'
import * as fs from 'fs'
import { expect } from '@oclif/test'
import getAssets from './getAssets'

const context = {
  bind: 'localhost',
  port: 1000,
  logs: true,
  host: 'localhost',
  subdomain: 'z3n',
  username: 'admin@zendesk.com',
  password: '123456',
  origin: 'https://z3n.zendesk.com'
}

describe('getAssets', () => {
  beforeEach(() => {
    sinon.restore()
  })

  it('returns an array of tuples containing the parsed path and url for each asset', () => {
    const readdirSyncStub = sinon.stub(fs, 'readdirSync')

    readdirSyncStub.returns(['.gitkeep', 'foo.png', 'bar.png'] as any)

    const assets = getAssets('theme/path', context)

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

  it('throws and error when an asset has illegal characters in its name', () => {
    const readdirSyncStub = sinon.stub(fs, 'readdirSync')

    readdirSyncStub.returns(['unsuported file name.png'] as any)

    expect(() => {
      getAssets('theme/path', context)
    }).to.throw('The asset "unsuported file name.png" has illegal characters in its name. Filenames should only have alpha-numerical characters, ., _, -, and +')
  })
})
