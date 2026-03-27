/* eslint-disable @typescript-eslint/no-explicit-any */

import { expect } from 'chai'
import * as sinon from 'sinon'
import { request } from '@zendesk/zcli-core'
import { getProvisioningStatus } from './status'

describe('getProvisioningStatus', () => {
  let requestAPIStub: sinon.SinonStub

  afterEach(() => {
    sinon.restore()
  })

  it('should return the provisioning status for a connector', async () => {
    requestAPIStub = sinon.stub(request, 'requestAPI').resolves({
      status: 200,
      data: {
        id: '01KKWDA6BV6SGNQRFSMW5HEYSY',
        connector_name: 'my-connector',
        version: '1.0.0',
        status: 'SUCCESS',
        reason: null
      }
    } as any)

    const result = await getProvisioningStatus('my-connector')

    expect(result.id).to.equal('01KKWDA6BV6SGNQRFSMW5HEYSY')
    expect(result.connectorName).to.equal('my-connector')
    expect(result.version).to.equal('1.0.0')
    expect(result.status).to.equal('SUCCESS')
    expect(result.reason).to.equal(undefined)
  })

  it('should call the correct endpoint with the connector name', async () => {
    requestAPIStub = sinon.stub(request, 'requestAPI').resolves({
      status: 200,
      data: {
        id: '01KKWDA6BV6SGNQRFSMW5HEYSY',
        connector_name: 'test-connector',
        version: '2.0.0',
        status: 'PENDING_VALIDATION',
        reason: null
      }
    } as any)

    await getProvisioningStatus('test-connector')

    const callArgs = requestAPIStub.getCall(0)
    expect(callArgs.args[0]).to.equal('/flowstate/connectors/private/test-connector/provisioning_status')
    expect(callArgs.args[1].method).to.equal('GET')
  })

  it('should include reason when status is FAILED', async () => {
    requestAPIStub = sinon.stub(request, 'requestAPI').resolves({
      status: 200,
      data: {
        id: '01KKWDA6BV6SGNQRFSMW5HEYSY',
        connector_name: 'my-connector',
        version: '1.0.0',
        status: 'FAILED',
        reason: 'Invalid manifest schema'
      }
    } as any)

    const result = await getProvisioningStatus('my-connector')

    expect(result.status).to.equal('FAILED')
    expect(result.reason).to.equal('Invalid manifest schema')
  })

  it('should throw an error when the API returns a non-200 status', async () => {
    requestAPIStub = sinon.stub(request, 'requestAPI').resolves({
      status: 404,
      data: { error: 'Connector not found' }
    } as any)

    try {
      await getProvisioningStatus('unknown-connector')
      expect.fail('Should have thrown an error')
    } catch (error) {
      expect((error as Error).message).to.include('Failed to fetch provisioning status')
      expect((error as Error).message).to.include('Connector not found')
    }
  })

  it('should throw an error when the request fails', async () => {
    requestAPIStub = sinon.stub(request, 'requestAPI').rejects(new Error('Network error'))

    try {
      await getProvisioningStatus('my-connector')
      expect.fail('Should have thrown an error')
    } catch (error) {
      expect((error as Error).message).to.include('Network error')
    }
  })
})
