import * as sinon from 'sinon'
import * as fs from 'fs'
import { expect } from '@oclif/test'
import getManifest from './getManifest'

describe('getManifest', () => {
  beforeEach(() => {
    sinon.restore()
  })

  it('returns the manifest.json file parsed as json', () => {
    const existsSyncStub = sinon.stub(fs, 'existsSync')
    const readFileSyncStub = sinon.stub(fs, 'readFileSync')

    const manifest = {
      name: 'Copenhagen theme',
      author: 'Jane Doe',
      version: '1.0.1',
      api_version: 1,
      settings: []
    }

    existsSyncStub
      .withArgs('theme/path/manifest.json')
      .returns(true)

    readFileSyncStub
      .withArgs('theme/path/manifest.json')
      .returns(JSON.stringify(manifest))

    expect(getManifest('theme/path')).to.deep.equal(manifest)
  })

  it('throws and error when it can\'t find a manifest.json file', () => {
    const existsSyncStub = sinon.stub(fs, 'existsSync')

    existsSyncStub
      .withArgs('theme/path/manifest.json')
      .returns(false)

    expect(() => {
      getManifest('theme/path')
    }).to.throw('Couldn\'t find a manifest.json file at path: "theme/path/manifest.json"')
  })

  it('throws and error when the manifest.json file is malformed', () => {
    const existsSyncStub = sinon.stub(fs, 'existsSync')
    const readFileSyncStub = sinon.stub(fs, 'readFileSync')

    existsSyncStub
      .withArgs('theme/path/manifest.json')
      .returns(true)

    readFileSyncStub
      .withArgs('theme/path/manifest.json')
      .returns('{"name": "Copenhagen theme",,, }')

    expect(() => {
      getManifest('theme/path')
    }).to.throw('manifest.json file was malformed at path: "theme/path/manifest.json"')
  })
})
