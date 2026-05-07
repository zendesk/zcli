import { expect } from '@oclif/test'
import validationErrorsToString from './validationErrorsToString'

describe('validationErrorsToString', () => {
  it('returns a formatted string containing all validation errors', () => {
    const validationErrors = {
      'templates/home_page.hbs': [
        {
          description: 'not possible to access `names` in `help_center.names`',
          line: 1,
          column: 45,
          length: 5
        },
        {
          description: "'articles' does not exist",
          line: 21,
          column: 16,
          length: 11
        }
      ],
      'templates/new_request_page.hbs': [
        {
          description: "'post_form' does not exist",
          line: 22,
          column: 6,
          length: 10
        }
      ]
    }

    const string = validationErrorsToString('theme/path', validationErrors)

    expect(string).to.contain('theme/path/templates/home_page.hbs:1:45')
    expect(string).to.contain('not possible to access `names` in `help_center.names`')

    expect(string).to.contain('theme/path/templates/home_page.hbs:21:16')
    expect(string).to.contain("'articles' does not exist")

    expect(string).to.contain('templates/new_request_page.hbs')
    expect(string).to.contain("'post_form' does not exist")
  })

  it('includes the :line:column suffix when line or column is 0', () => {
    const validationErrors = {
      'templates/home_page.hbs': [
        {
          description: 'error at start of file',
          line: 0,
          column: 0,
          length: 1
        }
      ]
    }

    const string = validationErrorsToString('theme/path', validationErrors)

    expect(string).to.contain('theme/path/templates/home_page.hbs:0:0')
  })

  it('omits the suffix when line and column are not provided', () => {
    const validationErrors = {
      'templates/home_page.hbs': [
        {
          description: 'error without location'
        }
      ]
    }

    const string = validationErrorsToString('theme/path', validationErrors)

    expect(string).to.contain('theme/path/templates/home_page.hbs\n')
    expect(string).to.not.contain('home_page.hbs:')
  })
})
