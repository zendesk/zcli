import { expect } from 'chai'
import * as sinon from 'sinon'
import * as child_process from 'child_process'
import { openBrowser, _pickCommand } from './openBrowser'

describe('openBrowser', () => {
  it('chooses `open` on darwin', () => {
    expect(_pickCommand('darwin')).to.deep.equal({ cmd: 'open', args: [] })
  })
  it('chooses `start` on win32', () => {
    expect(_pickCommand('win32')).to.deep.equal({ cmd: 'cmd', args: ['/c', 'start', '""'] })
  })
  it('chooses `xdg-open` on linux', () => {
    expect(_pickCommand('linux')).to.deep.equal({ cmd: 'xdg-open', args: [] })
  })

  it('spawns the chosen command with the URL as the last arg', () => {
    const stub = sinon.stub(child_process, 'spawn').returns({
      unref: () => undefined,
      on: () => undefined
    } as any)
    try {
      openBrowser('https://example.com', 'darwin')
      expect(stub.calledOnce).to.equal(true)
      const [cmd, args] = stub.firstCall.args
      expect(cmd).to.equal('open')
      expect(args).to.deep.equal(['https://example.com'])
    } finally {
      stub.restore()
    }
  })
})
