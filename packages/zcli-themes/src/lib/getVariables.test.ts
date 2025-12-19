import * as sinon from 'sinon'
import * as fs from 'fs'
import { expect } from '@oclif/test'
import getVariables from './getVariables'

const settings = [{
  variables: [
    { identifier: 'color', type: 'color', value: '#999' },
    { identifier: 'logo', type: 'file' },
    { identifier: 'favicon', type: 'file' }
  ]
}]

const flags = {
  bind: 'localhost',
  port: 1000,
  logs: true,
  livereload: true
}

describe('getVariables', () => {
  beforeEach(() => {
    sinon.restore()
  })

  it('returns an array of variables', () => {
    const existsSyncStub = sinon.stub(fs, 'existsSync')
    const readdirSyncStub = sinon.stub(fs, 'readdirSync')

    existsSyncStub
      .withArgs('theme/path/settings')
      .returns(true)

    readdirSyncStub.returns(['logo.png', 'favicon.png'] as unknown as fs.Dirent[])

    expect(getVariables('theme/path', settings, flags)).to.deep.equal([
      { identifier: 'color', type: 'color', value: '#999' },
      { identifier: 'logo', type: 'file', value: 'http://localhost:1000/guide/settings/logo.png' },
      { identifier: 'favicon', type: 'file', value: 'http://localhost:1000/guide/settings/favicon.png' }
    ])
  })

  it('throws an error when it doesn\'t find an asset within the settings folder for a variable of type "file"', () => {
    const existsSyncStub = sinon.stub(fs, 'existsSync')
    const readdirSyncStub = sinon.stub(fs, 'readdirSync')

    existsSyncStub
      .withArgs('theme/path/settings')
      .returns(true)

    readdirSyncStub.returns(['logo.png'] as unknown as fs.Dirent[])

    expect(() => {
      getVariables('theme/path', settings, flags)
    }).to.throw('The setting "favicon" of type "file" does not have a matching file within the "settings" folder')
  })
})
