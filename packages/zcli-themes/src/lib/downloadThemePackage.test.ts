import * as sinon from 'sinon'
import { expect } from '@oclif/test'
import * as axios from 'axios'
import * as fs from 'fs'
import * as path from 'path'
import { request } from '@zendesk/zcli-core'
import downloadThemePackage from './downloadThemePackage'
import * as errors from '@oclif/core/lib/errors'

describe('downloadThemePackage', () => {
  beforeEach(() => {
    sinon.restore()
  })

  it('downloads the package from the presigned url and writes it to the destination', async () => {
    const requestStub = sinon.stub(request, 'requestRaw')
    const writeFileStub = sinon.stub(fs, 'writeFileSync')

    requestStub.returns(Promise.resolve({ data: Buffer.from('theme content') }) as axios.AxiosPromise)

    const filePath = await downloadThemePackage('download/url', '1234', '/tmp/exports')

    expect(requestStub.calledWith('download/url', sinon.match({
      method: 'GET',
      responseType: 'arraybuffer'
    }))).to.equal(true)

    expect(filePath).to.equal(path.join('/tmp/exports', 'theme_1234.zip'))
    expect(writeFileStub.calledWith(filePath, sinon.match.instanceOf(Buffer))).to.equal(true)
  })

  it('errors when the download fails', async () => {
    const requestStub = sinon.stub(request, 'requestRaw')
    const errorStub = sinon.stub(errors, 'error').callThrough()
    const error = new axios.AxiosError('Network error')

    requestStub.throws(error)

    try {
      await downloadThemePackage('download/url', '1234', '/tmp/exports')
    } catch {
      expect(errorStub.calledWith(error)).to.equal(true)
    }
  })
})
