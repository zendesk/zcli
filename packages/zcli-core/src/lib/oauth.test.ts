import { expect } from 'chai'
import * as crypto from 'crypto'
import * as sinon from 'sinon'
import axios from 'axios'
import { generatePkce, generateState, buildAuthorizeUrl, exchangeCodeForToken, refreshAccessToken } from './oauth'

describe('oauth', () => {
  describe('generatePkce', () => {
    it('returns a verifier 43-128 chars and a matching S256 challenge', () => {
      const { verifier, challenge, method } = generatePkce()
      expect(method).to.equal('S256')
      expect(verifier.length).to.be.greaterThanOrEqual(43)
      expect(verifier.length).to.be.lessThanOrEqual(128)
      expect(verifier).to.match(/^[A-Za-z0-9\-._~]+$/)

      const expected = crypto.createHash('sha256').update(verifier).digest('base64url')
      expect(challenge).to.equal(expected)
    })

    it('generates different verifiers on consecutive calls', () => {
      const a = generatePkce().verifier
      const b = generatePkce().verifier
      expect(a).to.not.equal(b)
    })
  })

  describe('generateState', () => {
    it('returns a non-empty url-safe random string', () => {
      const s = generateState()
      expect(s).to.be.a('string')
      expect(s.length).to.be.greaterThanOrEqual(16)
      expect(s).to.match(/^[A-Za-z0-9\-_]+$/)
    })

    it('is unique per call', () => {
      expect(generateState()).to.not.equal(generateState())
    })
  })

  describe('buildAuthorizeUrl', () => {
    it('builds the Zendesk authorize URL with all required PKCE params', () => {
      const url = buildAuthorizeUrl({
        subdomain: 'z3ntest',
        clientId: 'my-client',
        redirectUri: 'http://localhost:8976/callback',
        scope: 'read write',
        state: 'state-abc',
        codeChallenge: 'challenge-xyz'
      })

      const parsed = new URL(url)
      expect(parsed.origin).to.equal('https://z3ntest.zendesk.com')
      expect(parsed.pathname).to.equal('/oauth/authorizations/new')
      expect(parsed.searchParams.get('response_type')).to.equal('code')
      expect(parsed.searchParams.get('client_id')).to.equal('my-client')
      expect(parsed.searchParams.get('redirect_uri')).to.equal('http://localhost:8976/callback')
      expect(parsed.searchParams.get('scope')).to.equal('read write')
      expect(parsed.searchParams.get('state')).to.equal('state-abc')
      expect(parsed.searchParams.get('code_challenge')).to.equal('challenge-xyz')
      expect(parsed.searchParams.get('code_challenge_method')).to.equal('S256')
    })

    it('honors a custom domain', () => {
      const url = buildAuthorizeUrl({
        subdomain: 'z3ntest',
        domain: 'example.com',
        clientId: 'my-client',
        redirectUri: 'http://localhost:8976/callback',
        scope: 'read write',
        state: 's',
        codeChallenge: 'c'
      })
      expect(new URL(url).origin).to.equal('https://z3ntest.example.com')
    })
  })

  describe('exchangeCodeForToken', () => {
    let postStub: sinon.SinonStub

    beforeEach(() => {
      postStub = sinon.stub(axios, 'post')
    })

    afterEach(() => {
      postStub.restore()
    })

    it('POSTs to /oauth/tokens with PKCE verifier and no client_secret', async () => {
      postStub.resolves({
        status: 200,
        data: {
          access_token: 'AT',
          refresh_token: 'RT',
          token_type: 'bearer',
          scope: 'read write'
        }
      })

      const result = await exchangeCodeForToken({
        subdomain: 'z3ntest',
        clientId: 'cid',
        code: 'the-code',
        redirectUri: 'http://localhost:8976/callback',
        codeVerifier: 'verifier-123',
        scope: 'read write'
      })

      expect(postStub.calledOnce).to.equal(true)
      const [url, body] = postStub.firstCall.args
      expect(url).to.equal('https://z3ntest.zendesk.com/oauth/tokens')
      expect(body).to.deep.equal({
        grant_type: 'authorization_code',
        code: 'the-code',
        client_id: 'cid',
        redirect_uri: 'http://localhost:8976/callback',
        scope: 'read write',
        code_verifier: 'verifier-123'
      })
      expect(body).to.not.have.property('client_secret')

      expect(result).to.deep.equal({
        accessToken: 'AT',
        refreshToken: 'RT',
        scope: 'read write'
      })
    })

    it('returns undefined refreshToken when not present', async () => {
      postStub.resolves({
        status: 200,
        data: { access_token: 'AT', token_type: 'bearer' }
      })

      const result = await exchangeCodeForToken({
        subdomain: 'z3ntest',
        clientId: 'cid',
        code: 'c',
        redirectUri: 'http://localhost:8976/callback',
        codeVerifier: 'v',
        scope: 'read write'
      })

      expect(result.refreshToken).to.equal(undefined)
    })

    it('throws CLIError with the Zendesk error body on non-2xx', async () => {
      postStub.resolves({
        status: 400,
        data: { error: 'invalid_grant', error_description: 'bad code' }
      })

      let err: Error | undefined
      try {
        await exchangeCodeForToken({
          subdomain: 'z3ntest',
          clientId: 'cid',
          code: 'c',
          redirectUri: 'http://localhost:8976/callback',
          codeVerifier: 'v',
          scope: 'read write'
        })
      } catch (e) {
        err = e as Error
      }
      expect(err).to.not.equal(undefined)
      expect(err!.message).to.contain('invalid_grant')
    })
  })

  describe('refreshAccessToken', () => {
    let postStub: sinon.SinonStub

    beforeEach(() => {
      postStub = sinon.stub(axios, 'post')
    })

    afterEach(() => {
      postStub.restore()
    })

    it('POSTs refresh_token grant and returns new tokens', async () => {
      postStub.resolves({
        status: 200,
        data: {
          access_token: 'NEW_AT',
          refresh_token: 'NEW_RT',
          token_type: 'bearer'
        }
      })

      const result = await refreshAccessToken({
        subdomain: 'z3ntest',
        clientId: 'cid',
        refreshToken: 'old-RT'
      })

      const [url, body] = postStub.firstCall.args
      expect(url).to.equal('https://z3ntest.zendesk.com/oauth/tokens')
      expect(body).to.deep.equal({
        grant_type: 'refresh_token',
        refresh_token: 'old-RT',
        client_id: 'cid'
      })
      expect(body).to.not.have.property('client_secret')

      expect(result).to.deep.equal({
        accessToken: 'NEW_AT',
        refreshToken: 'NEW_RT',
        scope: undefined
      })
    })

    it('keeps the existing refresh token when none returned', async () => {
      postStub.resolves({
        status: 200,
        data: { access_token: 'NEW_AT', token_type: 'bearer' }
      })
      const result = await refreshAccessToken({
        subdomain: 'z3ntest',
        clientId: 'cid',
        refreshToken: 'old-RT'
      })
      expect(result.refreshToken).to.equal(undefined)
    })

    it('throws when Zendesk rejects the refresh token', async () => {
      postStub.resolves({
        status: 401,
        data: { error: 'invalid_grant' }
      })

      let err: Error | undefined
      try {
        await refreshAccessToken({
          subdomain: 'z3ntest',
          clientId: 'cid',
          refreshToken: 'expired-RT'
        })
      } catch (e) { err = e as Error }
      expect(err).to.not.equal(undefined)
      expect(err!.message).to.contain('invalid_grant')
    })
  })
})
