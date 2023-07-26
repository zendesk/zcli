import * as sinon from 'sinon'
import { expect } from '@oclif/test'
import * as axios from 'axios'
import { request } from '@zendesk/zcli-core'
import getBrandId from './getBrandId'
import * as inquirer from 'inquirer'
import * as errors from '@oclif/core/lib/errors'

describe('getBrandId', () => {
  beforeEach(() => {
    sinon.restore()
  })

  it('returns the brandId of the first brand when there\' only one brand', async () => {
    const requestStub = sinon.stub(request, 'requestAPI')

    requestStub.returns(Promise.resolve({
      data: {
        brands: [{
          id: 1234
        }]
      }
    }) as axios.AxiosPromise)

    const brandId = await getBrandId()

    expect(brandId).to.equal('1234')
  })

  it('prompts the user when there are multiple brands', async () => {
    const requestStub = sinon.stub(request, 'requestAPI')
    const promptStub = sinon.stub(inquirer, 'prompt')

    requestStub.returns(Promise.resolve({
      data: {
        brands: [
          { id: 1111, name: 'Brand 1' },
          { id: 2222, name: 'Brand 2' }
        ]
      }
    }) as axios.AxiosPromise)

    promptStub.returns(Promise.resolve({ brandId: '2222' }))

    const brandId = await getBrandId()

    expect(brandId).to.equal('2222')
  })

  it('handles failure when requesting brands', async () => {
    const requestStub = sinon.stub(request, 'requestAPI')
    const errorStub = sinon.stub(errors, 'error')

    requestStub.throws()

    try {
      await getBrandId()
    } catch {
      expect(errorStub.calledWith('Failed to retrieve brands')).to.equal(true)
    }
  })
})
