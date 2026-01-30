import { ValidationError, ValidationErrors } from '../types'
import validationErrorsToString from './validationErrorsToString'
import * as chalk from 'chalk'
import { error } from '@oclif/core/lib/errors'

export default function handleTemplateError (themePath: string, templateErrors: ValidationErrors) {
  const validationErrors: ValidationErrors = {}
  for (const [template, errors] of Object.entries(templateErrors)) {
    // the theming endpoints return the template identifier as the 'key' instead of
    // the template path. We must fix this so we can reuse `validationErrorsToString`
    // and align with the job import error handling
    validationErrors[`templates/${template}.hbs`] = errors as ValidationError[]
  }

  const title = `${chalk.bold('InvalidTemplates')} - Template(s) with syntax error(s)`
  const details = validationErrorsToString(themePath, validationErrors)

  error(`${title}\n${details}`)
}
