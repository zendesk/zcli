/* eslint-disable @typescript-eslint/no-explicit-any */

import { expect } from 'chai'
import * as sinon from 'sinon'
import { request } from '@zendesk/zcli-core'
import { getAdaptivePollIntervalMs, pollProvisioningStatus } from './poller'

describe('poller', () => {
  afterEach(() => {
    sinon.restore()
  })

  describe('getAdaptivePollIntervalMs', () => {
    it('should return proper poll intervals', () => {
      const now = 1000000000
      const realDateNow = Date.now
      Date.now = () => now

      try {
        expect(getAdaptivePollIntervalMs(now)).to.equal(5000)
        expect(getAdaptivePollIntervalMs(now - 30000)).to.equal(5000)
        expect(getAdaptivePollIntervalMs(now - 60000)).to.equal(30000)
        expect(getAdaptivePollIntervalMs(now - 300000)).to.equal(60000)
      } finally {
        Date.now = realDateNow
      }
    })
  })

  describe('pollProvisioningStatus', () => {
    let requestStub: sinon.SinonStub
    let clock: sinon.SinonFakeTimers

    beforeEach(() => {
      requestStub = sinon.stub(request, 'requestAPI')
      clock = sinon.useFakeTimers()
    })

    afterEach(() => {
      clock.restore()
    })

    it('should return immediately when status is SUCCESS', async () => {
      requestStub.resolves({
        status: 200,
        data: { status: 'SUCCESS', reason: 'Deployment completed' }
      })

      const result = await pollProvisioningStatus('test-connector', 'job-123')

      expect(result).to.deep.equal({
        status: 'SUCCESS',
        reason: 'Deployment completed'
      })
      // eslint-disable-next-line no-unused-expressions
      expect(requestStub.calledOnce).to.be.true
      expect(requestStub.firstCall.args[0]).to.equal('/flowstate/connectors/private/test-connector/provisioning_status/job-123')
    })

    it('should return immediately when status is FAILED', async () => {
      requestStub.resolves({
        status: 200,
        data: { status: 'FAILED', reason: 'Invalid configuration' }
      })

      const result = await pollProvisioningStatus('test-connector', 'job-123')

      expect(result).to.deep.equal({
        status: 'FAILED',
        reason: 'Invalid configuration'
      })
      // eslint-disable-next-line no-unused-expressions
      expect(requestStub.calledOnce).to.be.true
    })

    it('should return immediately when status is ABORTED', async () => {
      requestStub.resolves({
        status: 200,
        data: { status: 'ABORTED', reason: 'aborted the previous operation' }
      })

      const result = await pollProvisioningStatus('test-connector', 'job-123')

      expect(result).to.deep.equal({
        status: 'ABORTED',
        reason: 'aborted the previous operation'
      })
      // eslint-disable-next-line no-unused-expressions
      expect(requestStub.called).to.be.true
    })

    it('should poll multiple times until SUCCESS', async () => {
      requestStub
        .onFirstCall().resolves({
          status: 200,
          data: { status: 'PENDING_UPLOAD', reason: '' }
        })
        .onSecondCall().resolves({
          status: 200,
          data: { status: 'PENDING_VALIDATION', reason: '' }
        })
        .onThirdCall().resolves({
          status: 200,
          data: { status: 'SUCCESS', reason: '' }
        })

      const pollPromise = pollProvisioningStatus('test-connector', 'job-123')

      // Let the first request complete
      await Promise.resolve()

      // Advance time to trigger first poll interval
      await clock.tickAsync(5000)

      // Advance time to trigger second poll interval
      await clock.tickAsync(5000)

      const result = await pollPromise

      expect(result).to.deep.equal({ status: 'SUCCESS', reason: '' })
      expect(requestStub.callCount).to.equal(3)
    })

    it('should timeout after 5 minutes', async () => {
      requestStub.resolves({
        status: 200,
        data: { status: 'PENDING_UPLOAD', reason: '' }
      })

      const pollPromise = pollProvisioningStatus('test-connector', 'job-123')

      // Advance time by 5 minutes + 1 second
      await clock.tickAsync(5 * 60 * 1000 + 1000)

      try {
        await pollPromise
        expect.fail('Should have thrown timeout error')
      } catch (error) {
        expect(error).to.be.instanceOf(Error)
        expect((error as Error).message).to.equal('Provisioning status polling timed out after 5 minutes')
      }
    })

    it('should retry non-200 HTTP responses up to 3 times', async () => {
      requestStub
        .onFirstCall().resolves({
          status: 500,
          data: { error: 'Internal server error' }
        })
        .onSecondCall().resolves({
          status: 502,
          data: { error: 'Bad gateway' }
        })
        .onThirdCall().resolves({
          status: 503,
          data: { error: 'Service unavailable' }
        })
        .onCall(3).resolves({
          status: 500,
          data: { error: 'Still failing' }
        })

      const pollPromise = pollProvisioningStatus('test-connector', 'job-123')

      await clock.tickAsync(5000) // First retry
      await clock.tickAsync(10000) // Second retry
      await clock.tickAsync(20000) // Third retry

      try {
        await pollPromise
        expect.fail('Should have thrown error after retries')
      } catch (error) {
        expect(error).to.be.instanceOf(Error)
        expect((error as Error).message).to.include('HTTP 500')
        expect((error as Error).message).to.include('Still failing')
      }

      // Should have made 4 calls (1 initial + 3 retries)
      expect(requestStub.callCount).to.equal(4)
    })

    it('should use exponential backoff for retries', async () => {
      requestStub
        .onFirstCall().resolves({
          status: 500,
          data: { error: 'Server error' }
        })
        .onSecondCall().resolves({
          status: 200,
          data: { status: 'SUCCESS', reason: '' }
        })

      const pollPromise = pollProvisioningStatus('test-connector', 'job-123')

      // Let the first request fail and retry start
      await Promise.resolve()

      // First retry should wait 5 seconds (BASE_RETRY_DELAY_MS * 2^0)
      await clock.tickAsync(5000)

      const result = await pollPromise

      expect(result).to.deep.equal({ status: 'SUCCESS', reason: '' })
      expect(requestStub.callCount).to.equal(2)
    })

    it('should handle request API errors gracefully', async () => {
      requestStub.rejects(new Error('Network error'))

      try {
        await pollProvisioningStatus('test-connector', 'job-123')
        expect.fail('Should have thrown error')
      } catch (error) {
        expect(error).to.be.instanceOf(Error)
        expect((error as Error).message).to.equal('Failed to check provisioning status: Network error')
      }
    })

    it('should handle timeout errors specifically', async () => {
      requestStub.rejects(new Error('Request timed out after 30 seconds'))

      try {
        await pollProvisioningStatus('test-connector', 'job-123')
        expect.fail('Should have thrown error')
      } catch (error) {
        expect(error).to.be.instanceOf(Error)
        expect((error as Error).message).to.equal('Failed to check provisioning status: Request timed out after 30 seconds')
      }
    })
  })
})
