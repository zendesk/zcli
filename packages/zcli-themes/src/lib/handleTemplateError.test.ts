import * as sinon from 'sinon'
import { expect } from '@oclif/test'
import * as validationErrorsToString from './validationErrorsToString'
import * as errors from '@oclif/core/lib/errors'
import handleTemplateError from './handleTemplateError'

describe('handleTemplateError', () => {
  beforeEach(() => {
    sinon.restore()
  })

  it('transforms template identifiers to template paths and calls error', () => {
    const validationErrorsToStringStub = sinon.stub(validationErrorsToString, 'default').returns('formatted errors')
    const errorStub = sinon.stub(errors, 'error')

    const templateErrors = {
      home_page: [
        {
          description: 'not possible to access `names`',
          line: 1,
          column: 45,
          length: 5
        }
      ],
      article_page: [
        {
          description: "'articles' does not exist",
          line: 21,
          column: 16,
          length: 11
        }
      ]
    }

    handleTemplateError('theme/path', templateErrors)

    expect(validationErrorsToStringStub.calledOnce).to.equal(true)
    expect(validationErrorsToStringStub.firstCall.args[0]).to.equal('theme/path')

    const transformedErrors = validationErrorsToStringStub.firstCall.args[1]
    expect(transformedErrors).to.have.property('templates/home_page.hbs')
    expect(transformedErrors).to.have.property('templates/article_page.hbs')
    expect(transformedErrors['templates/home_page.hbs']).to.deep.equal([
      {
        description: 'not possible to access `names`',
        line: 1,
        column: 45,
        length: 5
      }
    ])

    expect(errorStub.calledOnce).to.equal(true)
    expect(errorStub.firstCall.args[0]).to.contain('InvalidTemplates')
    expect(errorStub.firstCall.args[0]).to.contain('Template(s) with syntax error(s)')
    expect(errorStub.firstCall.args[0]).to.contain('formatted errors')
  })

  it('handles empty template errors', () => {
    const validationErrorsToStringStub = sinon.stub(validationErrorsToString, 'default').returns('')
    const errorStub = sinon.stub(errors, 'error')

    handleTemplateError('theme/path', {})

    expect(validationErrorsToStringStub.calledOnce).to.equal(true)
    expect(validationErrorsToStringStub.firstCall.args[1]).to.deep.equal({})
    expect(errorStub.calledOnce).to.equal(true)
  })

  it('handles single template with multiple errors', () => {
    const validationErrorsToStringStub = sinon.stub(validationErrorsToString, 'default').returns('multiple errors')
    sinon.stub(errors, 'error')

    const templateErrors = {
      new_request_page: [
        {
          description: 'First error',
          line: 1,
          column: 1,
          length: 5
        },
        {
          description: 'Second error',
          line: 10,
          column: 5,
          length: 3
        },
        {
          description: 'Third error',
          line: 20,
          column: 10,
          length: 7
        }
      ]
    }

    handleTemplateError('/my/theme', templateErrors)

    const transformedErrors = validationErrorsToStringStub.firstCall.args[1]
    expect(transformedErrors['templates/new_request_page.hbs']).to.have.length(3)
    expect(transformedErrors['templates/new_request_page.hbs'][0].description).to.equal('First error')
    expect(transformedErrors['templates/new_request_page.hbs'][1].description).to.equal('Second error')
    expect(transformedErrors['templates/new_request_page.hbs'][2].description).to.equal('Third error')
  })
})
