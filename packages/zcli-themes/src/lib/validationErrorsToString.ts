import type { ValidationErrors } from '../types'
import * as chalk from 'chalk'

export default function validationErrorsToString (themePath: string, validationErrors: ValidationErrors): string {
  let string = ''

  for (const [template, errors] of Object.entries(validationErrors)) {
    for (const { line, column, description } of errors) {
      string += `\n${chalk.bold('Validation error')} ${themePath}/${template}${line && column ? `:${line}:${column}` : ''}\n ${description}\n`
    }
  }

  return string
}
