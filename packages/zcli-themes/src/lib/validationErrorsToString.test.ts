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
})
