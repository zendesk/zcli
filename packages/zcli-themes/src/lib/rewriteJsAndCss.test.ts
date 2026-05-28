import * as sinon from 'sinon'
import * as fs from 'fs'
import { expect } from '@oclif/test'
import rewriteJsAndCss from './rewriteJsAndCss'

describe('rewriteJsAndCss', () => {
  beforeEach(() => {
    sinon.restore()
  })

  it('writes style.css and script.js to the theme root', () => {
    const writeFileSyncStub = sinon.stub(fs, 'writeFileSync')

    rewriteJsAndCss('theme/path', {
      css: 'body { color: red; }',
      js: 'console.log("hi")'
    })

    expect(writeFileSyncStub.callCount).to.equal(2)
    expect(writeFileSyncStub.firstCall.args[0]).to.equal('theme/path/style.css')
    expect(writeFileSyncStub.firstCall.args[1]).to.equal('body { color: red; }')
    expect(writeFileSyncStub.secondCall.args[0]).to.equal('theme/path/script.js')
    expect(writeFileSyncStub.secondCall.args[1]).to.equal('console.log("hi")')
  })

  it('throws if style.css cannot be written', () => {
    const writeFileSyncStub = sinon.stub(fs, 'writeFileSync')
    writeFileSyncStub.withArgs('theme/path/style.css').throws(new Error('Permission denied'))

    expect(() => {
      rewriteJsAndCss('theme/path', { css: 'a', js: 'b' })
    }).to.throw('Failed to write file: theme/path/style.css')
  })

  it('throws if script.js cannot be written', () => {
    const writeFileSyncStub = sinon.stub(fs, 'writeFileSync')
    writeFileSyncStub.withArgs('theme/path/script.js').throws(new Error('Permission denied'))

    expect(() => {
      rewriteJsAndCss('theme/path', { css: 'a', js: 'b' })
    }).to.throw('Failed to write file: theme/path/script.js')
  })
})
