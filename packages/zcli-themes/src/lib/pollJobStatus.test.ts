import * as sinon from 'sinon'
import { expect } from '@oclif/test'
import * as axios from 'axios'
import { request } from '@zendesk/zcli-core'
import pollJobStatus from './pollJobStatus'
import * as chalk from 'chalk'
import * as errors from '@oclif/core/lib/errors'

describe('pollJobStatus', () => {
  beforeEach(() => {
    sinon.restore()
  })

  it('polls the jobs/{jobId} endpoint until the job is completed', async () => {
    const requestStub = sinon.stub(request, 'requestAPI')

    requestStub
      .onFirstCall()
      .returns(Promise.resolve({ data: { job: { status: 'pending' } } }) as axios.AxiosPromise)
      .onSecondCall()
      .returns(Promise.resolve({ data: { job: { status: 'pending' } } }) as axios.AxiosPromise)
      .onThirdCall()
      .returns(Promise.resolve({ data: { job: { status: 'completed', theme_id: '1234' } } }) as axios.AxiosPromise)

    await pollJobStatus('theme/path', '9999', 10)

    expect(requestStub.calledWith('/api/v2/guide/theming/jobs/9999')).to.equal(true)
    expect(requestStub.callCount).to.equal(3)
  })

  it('times out after the specified number of retries', async () => {
    const requestStub = sinon.stub(request, 'requestAPI')
    const errorStub = sinon.stub(errors, 'error')

    requestStub
      .onFirstCall()
      .returns(Promise.resolve({ data: { job: { status: 'pending' } } }) as axios.AxiosPromise)
      .onSecondCall()
      .returns(Promise.resolve({ data: { job: { status: 'pending' } } }) as axios.AxiosPromise)
      .onThirdCall()
      .returns(Promise.resolve({ data: { job: { status: 'pending' } } }) as axios.AxiosPromise)

    await pollJobStatus('theme/path', '9999', 10, 3)

    expect(requestStub.callCount).to.equal(3)
    expect(errorStub.calledWith('Import job timed out')).to.equal(true)
  })

  it('handles job errors', async () => {
    const requestStub = sinon.stub(request, 'requestAPI')
    const errorStub = sinon.stub(errors, 'error').callThrough()

    requestStub
      .onFirstCall()
      .returns(Promise.resolve({ data: { job: { status: 'pending' } } }) as axios.AxiosPromise)
      .onSecondCall()
      .returns(Promise.resolve({
        data: {
          job: {
            status: 'failed',
            errors: [
              {
                message: 'Template(s) with syntax error(s)',
                code: 'InvalidTemplates',
                meta: {
                  'templates/home_page.hbs': [
                    {
                      description: 'not possible to access `names` in `help_center.names`',
                      line: 1,
                      column: 45,
                      length: 5
                    },
                    {
                      description: "'categoriess' does not exist",
                      line: 21,
                      column: 16,
                      length: 11
                    }
                  ],
                  'templates/new_request_page.hbs': [
                    {
                      description: "'request_fosrm' does not exist",
                      line: 22,
                      column: 6,
                      length: 10
                    }
                  ]
                }
              }
            ]
          }
        }
      }) as axios.AxiosPromise)

    try {
      await pollJobStatus('theme/path', '9999', 10, 2)
    } catch {
      expect(requestStub.callCount).to.equal(2)
      expect(errorStub.calledWithMatch('Template(s) with syntax error(s)')).to.equal(true)

      expect(errorStub.calledWithMatch(`${chalk.bold('Validation error')} theme/path/templates/home_page.hbs:1:45`)).to.equal(true)
      expect(errorStub.calledWithMatch('not possible to access `names` in `help_center.names`')).to.equal(true)

      expect(errorStub.calledWithMatch(`${chalk.bold('Validation error')} theme/path/templates/home_page.hbs:21:16`)).to.equal(true)
      expect(errorStub.calledWithMatch("'categoriess' does not exist")).to.equal(true)

      expect(errorStub.calledWithMatch(`${chalk.bold('Validation error')} theme/path/templates/new_request_page.hbs:22:6`)).to.equal(true)
      expect(errorStub.calledWithMatch("'request_fosrm' does not exist")).to.equal(true)
    }
  })
})
