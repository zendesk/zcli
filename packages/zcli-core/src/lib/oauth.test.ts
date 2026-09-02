import { expect } from '@oclif/test'
import * as sinon from 'sinon'
import * as crypto from 'crypto'
import * as http from 'http'
import {
  generateCodeVerifier,
  generateCodeChallenge,
  generatePKCEPair,
  generateState,
  buildAuthorizeUrl,
  startCallbackServer,
  exchangeCodeForToken,
  refreshAccessToken,
  fetchClientCredentialsToken,
  encodeOAuthSecret,
  decodeOAuthSecret,
  ERR_PORTS_IN_USE
} from './oauth'

const FIXED_BYTES = Buffer.from(Array.from({ length: 32 }, (_, i) => i))

describe('oauth', () => {
  describe('generateCodeVerifier', () => {
    let randomBytesStub: sinon.SinonStub

    beforeEach(() => {
      randomBytesStub = sinon.stub(crypto, 'randomBytes') as unknown as sinon.SinonStub
      randomBytesStub.returns(FIXED_BYTES)
    })

    afterEach(() => {
      randomBytesStub.restore()
    })

    it('produces a deterministic, url-safe string', () => {
      const verifier = generateCodeVerifier()
      expect(verifier).to.equal(FIXED_BYTES.toString('base64url'))
      expect(verifier).to.not.match(/[+/=]/)
    })
  })

  describe('generateCodeChallenge', () => {
    it('produces the expected S256 digest for a known verifier', () => {
      const expected = crypto.createHash('sha256').update('known-verifier').digest('base64url')
      expect(generateCodeChallenge('known-verifier')).to.equal(expected)
    })
  })

  describe('generatePKCEPair', () => {
    it('returns a matching verifier/challenge pair', () => {
      const { codeVerifier, codeChallenge } = generatePKCEPair()
      expect(generateCodeChallenge(codeVerifier)).to.equal(codeChallenge)
    })
  })

  describe('generateState', () => {
    it('returns a url-safe random string', () => {
      const state = generateState()
      expect(state).to.be.a('string')
      expect(state).to.not.match(/[+/=]/)
    })
  })

  describe('buildAuthorizeUrl', () => {
    it('builds the authorize url with the default domain', () => {
      const url = buildAuthorizeUrl({
        subdomain: 'z3ntest',
        redirectUri: 'http://localhost:8976/',
        state: 'abc',
        codeChallenge: 'xyz'
      })
      const parsed = new URL(url)
      expect(parsed.origin + parsed.pathname).to.equal('https://z3ntest.zendesk.com/oauth/authorizations/new')
      expect(parsed.searchParams.get('response_type')).to.equal('code')
      expect(parsed.searchParams.get('redirect_uri')).to.equal('http://localhost:8976/')
      expect(parsed.searchParams.get('scope')).to.equal('read write')
      expect(parsed.searchParams.get('state')).to.equal('abc')
      expect(parsed.searchParams.get('code_challenge')).to.equal('xyz')
      expect(parsed.searchParams.get('code_challenge_method')).to.equal('S256')
    })

    it('builds the authorize url with a custom domain', () => {
      const url = buildAuthorizeUrl({
        subdomain: 'z3ntest',
        domain: 'example.com',
        redirectUri: 'http://localhost:8976/',
        state: 'abc',
        codeChallenge: 'xyz'
      })
      expect(url.startsWith('https://z3ntest.example.com/oauth/authorizations/new')).to.equal(true)
    })
  })

  describe('startCallbackServer', () => {
    it('resolves with the code on a valid callback', async () => {
      const { port, waitForCallback } = await startCallbackServer('expected-state', [18976, 18977, 18978])
      const promise = waitForCallback()
      await new Promise(resolve => {
        http.get(`http://localhost:${port}/?code=abc123&state=expected-state`, resolve)
      })
      const result = await promise
      expect(result).to.deep.equal({ code: 'abc123' })
    })

    it('ignores requests with a state mismatch and keeps listening for a valid callback', async () => {
      const { port, waitForCallback } = await startCallbackServer('expected-state', [18979, 18980, 18981])
      const promise = waitForCallback()

      const mismatchResponse = await new Promise<http.IncomingMessage>(resolve => {
        http.get(`http://localhost:${port}/?code=abc123&state=wrong-state`, resolve)
      })
      expect(mismatchResponse.statusCode).to.equal(404)

      await new Promise(resolve => {
        http.get(`http://localhost:${port}/?code=abc123&state=expected-state`, resolve)
      })
      const result = await promise
      expect(result).to.deep.equal({ code: 'abc123' })
    })

    it('rejects on an error callback', async () => {
      const { port, waitForCallback } = await startCallbackServer('expected-state', [18982, 18983, 18984])
      const promise = waitForCallback()
      http.get(`http://localhost:${port}/?error=access_denied&error_description=User%20denied%20access&state=expected-state`)
      try {
        await promise
        expect.fail('should have rejected')
      } catch (error) {
        expect((error as Error).message).to.match(/User denied access/)
      }
    })

    it('escapes HTML in error responses to prevent XSS', async () => {
      const { port, waitForCallback } = await startCallbackServer('expected-state', [18985, 18986, 18987])
      const promise = waitForCallback()

      const xssPayload = '<script>alert(1)</script>'
      const encodedPayload = encodeURIComponent(xssPayload)

      const response = await new Promise<string>((resolve) => {
        http.get(`http://localhost:${port}/?error=xss_test&error_description=${encodedPayload}&state=expected-state`, (res) => {
          let data = ''
          res.on('data', (chunk) => { data += chunk })
          res.on('end', () => resolve(data))
        })
      })

      expect(response).to.include('&lt;script&gt;alert(1)&lt;/script&gt;')
      expect(response).to.not.include('<script>alert(1)</script>')

      try {
        await promise
        expect.fail('should have rejected')
      } catch (error) {
        expect((error as Error).message).to.include('script')
      }
    })

    it('falls back to the next port if the first is in use', async () => {
      const blocker = http.createServer()
      await new Promise<void>(resolve => blocker.listen(18988, resolve))
      try {
        const { port, close } = await startCallbackServer('expected-state', [18988, 18989, 18990])
        expect(port).to.equal(18989)
        close()
      } finally {
        blocker.close()
      }
    })

    it('throws the exact error message when all ports are in use', async () => {
      const blockerA = http.createServer()
      const blockerB = http.createServer()
      await new Promise<void>(resolve => blockerA.listen(18991, resolve))
      await new Promise<void>(resolve => blockerB.listen(18992, resolve))
      try {
        await startCallbackServer('expected-state', [18991, 18992])
        expect.fail('should have thrown')
      } catch (error) {
        expect((error as Error).message).to.equal(ERR_PORTS_IN_USE)
      } finally {
        blockerA.close()
        blockerB.close()
      }
    })
  })

  describe('exchangeCodeForToken', () => {
    let fetchStub: sinon.SinonStub

    beforeEach(() => {
      fetchStub = sinon.stub(global, 'fetch')
    })

    afterEach(() => {
      fetchStub.restore()
    })

    it('posts the expected body without a client_secret', async () => {
      fetchStub.withArgs(sinon.match((req: Request) =>
        req.method === 'POST' &&
        req.url === 'https://z3ntest.zendesk.com/oauth/tokens'
      )).resolves({
        status: 200,
        ok: true,
        text: () => Promise.resolve(JSON.stringify({
          access_token: 'at',
          refresh_token: 'rt',
          expires_in: 3600,
          token_type: 'bearer',
          scope: 'read write'
        }))
      })

      const result = await exchangeCodeForToken({
        subdomain: 'z3ntest',
        code: 'the-code',
        codeVerifier: 'the-verifier',
        redirectUri: 'http://localhost:8976/'
      })

      expect(result.access_token).to.equal('at')
      expect(result.refresh_token).to.equal('rt')

      const call = fetchStub.getCalls().find(c => c.args[0].url === 'https://z3ntest.zendesk.com/oauth/tokens')
      const body = JSON.parse(await call?.args[0].text())
      expect(body.grant_type).to.equal('authorization_code')
      expect(body.code_verifier).to.equal('the-verifier')
      expect(body.client_secret).to.equal(undefined)
    })
  })

  describe('refreshAccessToken', () => {
    let fetchStub: sinon.SinonStub

    beforeEach(() => {
      fetchStub = sinon.stub(global, 'fetch')
    })

    afterEach(() => {
      fetchStub.restore()
    })

    it('posts refresh_token grant without code_verifier or scope', async () => {
      fetchStub.withArgs(sinon.match((req: Request) =>
        req.method === 'POST' &&
        req.url === 'https://z3ntest.zendesk.com/oauth/tokens'
      )).resolves({
        status: 200,
        ok: true,
        text: () => Promise.resolve(JSON.stringify({
          access_token: 'new-at',
          refresh_token: 'new-rt',
          expires_in: 3600,
          token_type: 'bearer',
          scope: 'read write'
        }))
      })

      const result = await refreshAccessToken({ subdomain: 'z3ntest', refreshToken: 'old-rt' })

      expect(result.access_token).to.equal('new-at')
      expect(result.refresh_token).to.equal('new-rt')

      const call = fetchStub.getCalls().find(c => c.args[0].url === 'https://z3ntest.zendesk.com/oauth/tokens')
      const body = JSON.parse(await call?.args[0].text())
      expect(body.grant_type).to.equal('refresh_token')
      expect(body.refresh_token).to.equal('old-rt')
      expect(body.code_verifier).to.equal(undefined)
      expect(body.scope).to.equal(undefined)
    })
  })

  describe('fetchClientCredentialsToken', () => {
    let fetchStub: sinon.SinonStub

    beforeEach(() => {
      fetchStub = sinon.stub(global, 'fetch')
    })

    afterEach(() => {
      fetchStub.restore()
    })

    it('posts a client_credentials grant with the configured client credentials', async () => {
      fetchStub.withArgs(sinon.match((req: Request) =>
        req.method === 'POST' &&
        req.url === 'https://z3ntest.zendesk.com/oauth/tokens'
      )).resolves({
        status: 200,
        ok: true,
        text: () => Promise.resolve(JSON.stringify({
          access_token: 'at',
          expires_in: 3600,
          token_type: 'bearer',
          scope: 'read write'
        }))
      })

      const result = await fetchClientCredentialsToken({
        subdomain: 'z3ntest',
        clientId: 'client-id',
        clientSecret: 'client-secret'
      })

      expect(result.access_token).to.equal('at')
      const call = fetchStub.getCalls().find(c => c.args[0].url === 'https://z3ntest.zendesk.com/oauth/tokens')
      const body = JSON.parse(await call?.args[0].text())
      expect(body).to.deep.equal({
        grant_type: 'client_credentials',
        client_id: 'client-id',
        client_secret: 'client-secret'
      })
    })

    it('accepts a 201 response without expires_in', async () => {
      fetchStub.withArgs(sinon.match((req: Request) =>
        req.method === 'POST' &&
        req.url === 'https://z3ntest.zendesk.com/oauth/tokens'
      )).resolves({
        status: 201,
        ok: true,
        text: () => Promise.resolve(JSON.stringify({
          access_token: 'at',
          token_type: 'bearer',
          scope: 'read write'
        }))
      })

      const result = await fetchClientCredentialsToken({
        subdomain: 'z3ntest',
        clientId: 'client-id',
        clientSecret: 'client-secret'
      })

      expect(result.access_token).to.equal('at')
      expect(result.expires_in).to.equal(1800)
    })
  })

  describe('encodeOAuthSecret / decodeOAuthSecret', () => {
    it('round-trips accessToken, refreshToken, and expiresAt', () => {
      const before = Date.now()
      const secret = encodeOAuthSecret('at', 'rt', 3600)
      const decoded = decodeOAuthSecret(secret)
      expect(decoded?.accessToken).to.equal('at')
      expect(decoded?.refreshToken).to.equal('rt')
      expect(decoded?.expiresAt).to.be.at.least(before + 3600 * 1000)
    })

    it('returns undefined for a legacy Basic auth string', () => {
      expect(decodeOAuthSecret('Basic dGVzdA==')).to.equal(undefined)
    })

    it('returns undefined for malformed JSON', () => {
      expect(decodeOAuthSecret('{not valid json')).to.equal(undefined)
    })

    it('returns undefined for JSON missing accessToken', () => {
      expect(decodeOAuthSecret(JSON.stringify({ foo: 'bar' }))).to.equal(undefined)
    })

    it('returns undefined for JSON with accessToken but missing refreshToken', () => {
      expect(decodeOAuthSecret(JSON.stringify({ accessToken: 'at' }))).to.equal(undefined)
    })

    it('returns undefined for JSON with accessToken and refreshToken but missing expiresAt', () => {
      expect(decodeOAuthSecret(JSON.stringify({ accessToken: 'at', refreshToken: 'rt' }))).to.equal(undefined)
    })

    it('returns undefined for JSON with wrong types', () => {
      expect(decodeOAuthSecret(JSON.stringify({ accessToken: 'at', refreshToken: 'rt', expiresAt: 'not-a-number' }))).to.equal(undefined)
    })
  })
})
