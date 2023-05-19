import * as sinon from 'sinon'
import { expect } from '@oclif/test'
import * as axios from 'axios'
import { request } from '@zendesk/zcli-core'
import uploadThemePackage, { themeSizeLimit } from './uploadThemePackage'
import * as errors from '@oclif/core/lib/errors'
import * as fs from 'fs'
import * as FormData from 'form-data'

const job = {
  id: '9999',
  status: 'pending' as const,
  data: {
    theme_id: '1234',
    upload: {
      url: 'upload/url',
      parameters: {
        foo: 'foo',
        bar: 'bar'
      }
    }
  }
}

describe('uploadThemePackage', () => {
  beforeEach(() => {
    sinon.restore()
  })

  it('calls the job upload endpoint with the correct payload and returns the job', async () => {
    const readStreamStub = sinon.createStubInstance(fs.ReadStream)
    const requestStub = sinon.stub(request, 'requestAPI')

    await uploadThemePackage(job, readStreamStub)

    expect(requestStub.calledWith('upload/url', sinon.match({
      method: 'POST',
      data: sinon.match.instanceOf(FormData),
      maxBodyLength: themeSizeLimit,
      maxContentLength: themeSizeLimit
    }))).to.equal(true)
  })

  it('errors when the upload fails', async () => {
    const readStreamStub = sinon.createStubInstance(fs.ReadStream)
    const requestStub = sinon.stub(request, 'requestAPI')
    const errorStub = sinon.stub(errors, 'error').callThrough()
    const error = new axios.AxiosError('Network error')

    requestStub.throws(error)

    try {
      await uploadThemePackage(job, readStreamStub)
    } catch {
      expect(errorStub.calledWith(error)).to.equal(true)
    }
  })
})
