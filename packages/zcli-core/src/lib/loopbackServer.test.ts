import { expect } from 'chai'
import axios from 'axios'
import * as http from 'http'
import { awaitLoopbackCode } from './loopbackServer'

const PORT = 8976
const PATH = '/callback'
const BASE = `http://localhost:${PORT}${PATH}`

function bindBlocker (port: number): Promise<{ close: () => void }> {
  return new Promise((resolve, reject) => {
    const srv = http.createServer(() => undefined)
    srv.once('error', reject)
    srv.listen(port, '127.0.0.1', () => resolve({ close: () => srv.close() }))
  })
}

describe('awaitLoopbackCode', () => {
  it('resolves with the code when state matches', async () => {
    const promise = awaitLoopbackCode({
      port: PORT,
      path: PATH,
      expectedState: 'st-1',
      timeoutMs: 2000
    })

    await new Promise(resolve => setTimeout(resolve, 50))
    const res = await axios.get(`${BASE}?code=THE_CODE&state=st-1`, {
      validateStatus: () => true,
      adapter: 'fetch'
    })
    expect(res.status).to.equal(200)

    const code = await promise
    expect(code).to.equal('THE_CODE')
  })

  it('rejects when state does not match', async () => {
    const promise = awaitLoopbackCode({
      port: PORT,
      path: PATH,
      expectedState: 'st-good',
      timeoutMs: 2000
    })
    await new Promise(resolve => setTimeout(resolve, 50))
    await axios.get(`${BASE}?code=X&state=st-bad`, { validateStatus: () => true, adapter: 'fetch' })

    let err: Error | undefined
    try { await promise } catch (e) { err = e as Error }
    expect(err).to.not.equal(undefined)
    expect(err!.message.toLowerCase()).to.contain('state')
  })

  it('rejects when the callback returns ?error', async () => {
    const promise = awaitLoopbackCode({
      port: PORT,
      path: PATH,
      expectedState: 'st',
      timeoutMs: 2000
    })
    await new Promise(resolve => setTimeout(resolve, 50))
    await axios.get(`${BASE}?error=access_denied&state=st`, { validateStatus: () => true, adapter: 'fetch' })

    let err: Error | undefined
    try { await promise } catch (e) { err = e as Error }
    expect(err).to.not.equal(undefined)
    expect(err!.message).to.contain('access_denied')
  })

  it('rejects on timeout', async () => {
    let err: Error | undefined
    try {
      await awaitLoopbackCode({
        port: PORT,
        path: PATH,
        expectedState: 'st',
        timeoutMs: 100
      })
    } catch (e) { err = e as Error }
    expect(err).to.not.equal(undefined)
    expect(err!.message.toLowerCase()).to.contain('timed out')
  })

  it('rejects fast when the port is already in use', async () => {
    const blocker = await bindBlocker(PORT)
    try {
      let err: Error | undefined
      try {
        await awaitLoopbackCode({
          port: PORT,
          path: PATH,
          expectedState: 'st',
          timeoutMs: 1000
        })
      } catch (e) { err = e as Error }
      expect(err).to.not.equal(undefined)
      expect(err!.message.toLowerCase()).to.match(/in use|eaddrinuse/)
    } finally {
      blocker.close()
    }
  })
})
