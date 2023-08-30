import { expect } from '@oclif/test'
import { Flags } from '../types'
import { getLocalServerBaseUrl } from './getLocalServerBaseUrl'

describe('getLocalServerBaseUrl', () => {
  it('should return correct http url', () => {
    const flags: Flags = {
      bind: 'localhost',
      port: 4567,
      logs: false,
      livereload: true
    }
    const result = getLocalServerBaseUrl(flags)
    const expected = 'http://localhost:4567'
    expect(result).to.equal(expected)
  })

  it('should return correct https url', () => {
    const flags: Flags = {
      bind: 'themes.local',
      port: 4567,
      logs: false,
      livereload: true,
      'https-cert': 'localhost.crt',
      'https-key': 'localhost.key'
    }
    const result = getLocalServerBaseUrl(flags)
    const expected = 'https://themes.local:4567'
    expect(result).to.equal(expected)
  })

  it('should return correct ws url', () => {
    const flags: Flags = {
      bind: 'localhost',
      port: 4567,
      logs: false,
      livereload: true
    }
    const result = getLocalServerBaseUrl(flags, true)
    const expected = 'ws://localhost:4567'
    expect(result).to.equal(expected)
  })

  it('should return correct wss url', () => {
    const flags: Flags = {
      bind: 'themes.local',
      port: 4567,
      logs: false,
      livereload: true,
      'https-cert': 'localhost.crt',
      'https-key': 'localhost.key'
    }
    const result = getLocalServerBaseUrl(flags, true)
    const expected = 'wss://themes.local:4567'
    expect(result).to.equal(expected)
  })
})
