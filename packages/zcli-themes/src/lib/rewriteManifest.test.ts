import * as sinon from 'sinon'
import * as fs from 'fs'
import { expect } from '@oclif/test'
import rewriteManifest from './rewriteManifest'

describe('rewriteManifest', () => {
  beforeEach(() => {
    sinon.restore()
  })

  it('updates the api_version in manifest.json', () => {
    const readFileSyncStub = sinon.stub(fs, 'readFileSync')
    const writeFileSyncStub = sinon.stub(fs, 'writeFileSync')

    const manifestContent = JSON.stringify(
      {
        name: 'Copenhagen theme',
        author: 'Jane Doe',
        version: '1.0.1',
        api_version: 1,
        settings: []
      },
      null,
      2
    )

    readFileSyncStub
      .withArgs('theme/path/manifest.json', 'utf8')
      .returns(manifestContent)

    rewriteManifest('theme/path', 2)

    expect(writeFileSyncStub.calledOnce).to.equal(true)
    expect(writeFileSyncStub.firstCall.args[0]).to.equal(
      'theme/path/manifest.json'
    )

    const writtenContent = writeFileSyncStub.firstCall.args[1] as string
    const parsedContent = JSON.parse(writtenContent)
    expect(parsedContent.api_version).to.equal(2)
  })

  it('preserves formatting when updating api_version', () => {
    const readFileSyncStub = sinon.stub(fs, 'readFileSync')
    const writeFileSyncStub = sinon.stub(fs, 'writeFileSync')

    const manifestContent =
      '{\n  "name": "Copenhagen",\n  "api_version": 1,\n  "version": "1.0.0"\n}'

    readFileSyncStub
      .withArgs('theme/path/manifest.json', 'utf8')
      .returns(manifestContent)

    rewriteManifest('theme/path', 3)

    const writtenContent = writeFileSyncStub.firstCall.args[1]
    expect(writtenContent).to.equal(
      '{\n  "name": "Copenhagen",\n  "api_version": 3,\n  "version": "1.0.0"\n}'
    )
  })

  it('handles api_version with different spacing', () => {
    const readFileSyncStub = sinon.stub(fs, 'readFileSync')
    const writeFileSyncStub = sinon.stub(fs, 'writeFileSync')

    const manifestContent =
      '{"name": "Theme", "api_version"  :   1, "version": "1.0"}'

    readFileSyncStub
      .withArgs('theme/path/manifest.json', 'utf8')
      .returns(manifestContent)

    rewriteManifest('theme/path', 5)

    const writtenContent = writeFileSyncStub.firstCall.args[1]
    expect(writtenContent).to.include('"api_version": 5')
    expect(writtenContent).to.include('"name": "Theme"')
  })

  it('throws an error when file cannot be read', () => {
    const readFileSyncStub = sinon.stub(fs, 'readFileSync')

    readFileSyncStub
      .withArgs('theme/path/manifest.json', 'utf8')
      .throws(new Error('ENOENT: no such file or directory'))

    expect(() => {
      rewriteManifest('theme/path', 2)
    }).to.throw(
      'Failed to read or write manifest file: theme/path/manifest.json'
    )
  })

  it('throws an error when JSON is malformed', () => {
    const readFileSyncStub = sinon.stub(fs, 'readFileSync')

    readFileSyncStub
      .withArgs('theme/path/manifest.json', 'utf8')
      .returns('{"name": "Theme",,,}')

    expect(() => {
      rewriteManifest('theme/path', 2)
    }).to.throw(
      'Failed to read or write manifest file: theme/path/manifest.json'
    )
  })

  it('throws an error when file cannot be written', () => {
    const readFileSyncStub = sinon.stub(fs, 'readFileSync')
    const writeFileSyncStub = sinon.stub(fs, 'writeFileSync')

    const manifestContent = '{"name": "Theme", "api_version": 1}'

    readFileSyncStub
      .withArgs('theme/path/manifest.json', 'utf8')
      .returns(manifestContent)

    writeFileSyncStub
      .withArgs('theme/path/manifest.json')
      .throws(new Error('EACCES: permission denied'))

    expect(() => {
      rewriteManifest('theme/path', 2)
    }).to.throw(
      'Failed to read or write manifest file: theme/path/manifest.json'
    )
  })
})
