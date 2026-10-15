import { expect } from '@oclif/test'
import * as sinon from 'sinon'
import * as fs from 'fs'
import * as http from 'http'
import * as https from 'https'
import { Flags } from '../types'
import { createServer, getBaseUrl } from './server'

describe('getBaseUrl', () => {
  it('should return correct http url', () => {
    const flags: Flags = {
      bind: 'localhost',
      port: 4567,
      logs: false,
      livereload: true
    }
    const result = getBaseUrl(flags)
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
    const result = getBaseUrl(flags)
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
    const result = getBaseUrl(flags, true)
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
    const result = getBaseUrl(flags, true)
    const expected = 'wss://themes.local:4567'
    expect(result).to.equal(expected)
  })
})

describe('createServer', () => {
  beforeEach(() => {
    sinon.restore()
  })

  it('creates an http server by default', () => {
    const { server } = createServer({ bind: 'localhost', port: 4567, logs: false })

    expect(server).to.be.instanceOf(http.Server)
  })

  it('reads the key from https-key and the cert from https-cert', () => {
    const readFileSync = sinon.stub(fs, 'readFileSync')
    readFileSync.withArgs('/ssl/key.pem').returns('KEY')
    readFileSync.withArgs('/ssl/cert.pem').returns('CERT')
    const createHttpsServer = sinon.stub(https, 'createServer').returns({} as https.Server)

    createServer({
      bind: 'localhost',
      port: 4567,
      logs: false,
      'https-cert': '/ssl/cert.pem',
      'https-key': '/ssl/key.pem'
    })

    expect(createHttpsServer.calledWithMatch({ key: 'KEY', cert: 'CERT' })).to.equal(true)
  })

  it('errors when only one of https-cert/https-key is given', () => {
    expect(() => createServer({ bind: 'localhost', port: 4567, logs: false, 'https-cert': '/ssl/cert.pem' }))
      .to.throw(/--https-cert and --https-key must be provided together/)
  })
})
