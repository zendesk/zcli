import { expect } from 'chai'
import {
  CredentialRecord,
  parseCredential,
  serializeCredential
} from './credentialRecord'

describe('credentialRecord', () => {
  describe('parseCredential', () => {
    it('parses a legacy plain string as an api_token record with the string as authHeader', () => {
      const result = parseCredential('Basic abc123')
      expect(result).to.deep.equal({
        version: 2,
        type: 'api_token',
        authHeader: 'Basic abc123'
      })
    })

    it('parses an api_token JSON record', () => {
      const stored = JSON.stringify({
        version: 2,
        type: 'api_token',
        authHeader: 'Basic def456'
      })
      const result = parseCredential(stored)
      expect(result).to.deep.equal({
        version: 2,
        type: 'api_token',
        authHeader: 'Basic def456'
      })
    })

    it('parses an oauth JSON record', () => {
      const stored = JSON.stringify({
        version: 2,
        type: 'oauth',
        accessToken: 'a-token',
        refreshToken: 'r-token',
        clientId: 'cid'
      })
      const result = parseCredential(stored) as Extract<CredentialRecord, { type: 'oauth' }>
      expect(result.type).to.equal('oauth')
      expect(result.accessToken).to.equal('a-token')
      expect(result.refreshToken).to.equal('r-token')
      expect(result.clientId).to.equal('cid')
    })

    it('returns undefined when input is null or empty', () => {
      expect(parseCredential(null)).to.equal(undefined)
      expect(parseCredential('')).to.equal(undefined)
    })

    it('falls back to legacy when JSON has no version field', () => {
      const result = parseCredential('{"type":"api_token"}')
      expect(result).to.deep.equal({
        version: 2,
        type: 'api_token',
        authHeader: '{"type":"api_token"}'
      })
    })
  })

  describe('serializeCredential', () => {
    it('serializes oauth record as JSON', () => {
      const out = serializeCredential({
        version: 2,
        type: 'oauth',
        accessToken: 'a',
        refreshToken: 'r',
        clientId: 'c'
      })
      expect(JSON.parse(out)).to.deep.equal({
        version: 2,
        type: 'oauth',
        accessToken: 'a',
        refreshToken: 'r',
        clientId: 'c'
      })
    })

    it('serializes api_token record as JSON', () => {
      const out = serializeCredential({
        version: 2,
        type: 'api_token',
        authHeader: 'Basic xyz'
      })
      expect(JSON.parse(out)).to.deep.equal({
        version: 2,
        type: 'api_token',
        authHeader: 'Basic xyz'
      })
    })
  })
})
