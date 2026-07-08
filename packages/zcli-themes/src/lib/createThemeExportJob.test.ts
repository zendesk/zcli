import * as sinon from 'sinon'
import { expect } from '@oclif/test'
import * as axios from 'axios'
import { request } from '@zendesk/zcli-core'
import createThemeExportJob from './createThemeExportJob'
import * as chalk from 'chalk'
import * as errors from '@oclif/core/lib/errors'

describe('createThemeExportJob', () => {
  beforeEach(() => {
    sinon.restore()
  })

  it('calls the jobs/themes/exports endpoint with the correct payload and returns the job', async () => {
    const requestStub = sinon.stub(request, 'requestAPI')
    const job = {
      id: '9999',
      status: 'pending',
      data: { download: { url: 'download/url' } }
    }

    requestStub.returns(Promise.resolve({ data: { job } }) as axios.AxiosPromise)

    expect(await createThemeExportJob('1234')).to.equal(job)

    expect(requestStub.calledWith('/api/v2/guide/theming/jobs/themes/exports', sinon.match({
      method: 'POST',
      data: {
        job: {
          attributes: {
            theme_id: '1234',
            format: 'zip'
          }
        }
      }
    }))).to.equal(true)
  })

  it('errors when creation fails', async () => {
    const errorStub = sinon.stub(errors, 'error').callThrough()

    sinon.stub(request, 'requestAPI').throws({
      response: {
        data: {
          errors: [{
            code: 'ThemeNotFound',
            title: 'Invalid id'
          }]
        }
      }
    })

    try {
      await createThemeExportJob('1234')
    } catch {
      expect(errorStub.calledWith(`${chalk.bold('ThemeNotFound')} - Invalid id`)).to.equal(true)
    }
  })
})
