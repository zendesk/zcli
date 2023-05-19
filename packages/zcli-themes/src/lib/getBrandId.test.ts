import * as sinon from 'sinon'
import { expect } from '@oclif/test'
import * as axios from 'axios'
import { request } from '@zendesk/zcli-core'
import getBrandId from './getBrandId'
import * as inquirer from 'inquirer'

describe('getBrandId', () => {
  beforeEach(() => {
    sinon.restore()
  })

  it('returns the brandId of the first brand when there\' only one brand', async () => {
    const requestStub = sinon.stub(request, 'requestAPI')

    requestStub.returns(Promise.resolve({
      data: {
        brands: [{
          id: '1234'
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
          { id: '1111', name: 'Brand 1' },
          { id: '2222', name: 'Brand 2' }
        ]
      }
    }) as axios.AxiosPromise)

    promptStub.returns(Promise.resolve({ brandId: '2222' }))

    const brandId = await getBrandId()

    expect(brandId).to.equal('2222')
  })
})
