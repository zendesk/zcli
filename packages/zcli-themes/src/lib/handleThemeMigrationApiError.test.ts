import * as sinon from 'sinon'
import { expect } from '@oclif/test'
import * as errors from '@oclif/core/lib/errors'
import handleThemeMigrationApiError from './handleThemeMigrationApiError'
import type { AxiosError } from 'axios'

describe('handleThemeMigrationApiError', () => {
  beforeEach(() => {
    sinon.restore()
  })

  it('routes template_errors through handleTemplateError', () => {
    const errorStub = sinon.stub(errors, 'error').callThrough()
    const e = {
      response: {
        status: 400,
        data: {
          template_errors: {
            home_page: [{ description: "'articles' does not exist", line: 10, column: 6, length: 7 }]
          }
        }
      }
    } as unknown as AxiosError

    try {
      handleThemeMigrationApiError(e, 'theme/path')
    } catch {
      const [call] = errorStub.getCalls()
      const [thrown] = call.args
      expect(thrown).to.contain('theme/path/templates/home_page.hbs:10:6')
      expect(thrown).to.contain("'articles' does not exist")
    }
  })

  it('renders the server general_error suffixed with a plain issues URL on a 5xx', () => {
    const errorStub = sinon.stub(errors, 'error').callThrough()
    const e = {
      response: {
        status: 500,
        data: { general_error: 'Failed to migrate the theme.' }
      }
    } as unknown as AxiosError

    try {
      handleThemeMigrationApiError(e, 'theme/path')
    } catch {
      const [call] = errorStub.getCalls()
      const thrown = call.args[0] as string
      expect(thrown).to.match(/^Failed to migrate the theme\./)
      expect(thrown).to.contain('Please open an issue at https://github.com/zendesk/zcli/issues/new')
      expect(thrown).to.not.contain('themes-migrate')
      expect(thrown).to.not.contain('## What happened')
    }
  })

  it('throws the general_error verbatim on a 4xx', () => {
    const errorStub = sinon.stub(errors, 'error').callThrough()
    const e = {
      response: {
        status: 400,
        data: { general_error: 'Theme is already on the latest supported version for migration' }
      }
    } as unknown as AxiosError

    try {
      handleThemeMigrationApiError(e, 'theme/path')
    } catch {
      const [call] = errorStub.getCalls()
      expect(call.args[0]).to.equal('Theme is already on the latest supported version for migration')
    }
  })

  it('falls back to the axios message when no body fields are present', () => {
    const errorStub = sinon.stub(errors, 'error').callThrough()
    const e = {
      response: { status: 400, data: {} },
      message: 'Network error'
    } as unknown as AxiosError

    try {
      handleThemeMigrationApiError(e, 'theme/path')
    } catch {
      const [call] = errorStub.getCalls()
      expect(call.args[0]).to.equal('Network error')
    }
  })

  it('throws the original axios error when there is no response', () => {
    const errorStub = sinon.stub(errors, 'error').callThrough()
    const e = new Error('Connection refused') as AxiosError

    try {
      handleThemeMigrationApiError(e, 'theme/path')
    } catch {
      const [call] = errorStub.getCalls()
      expect(call.args[0]).to.equal(e)
    }
  })
})
