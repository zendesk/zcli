import { TemplateErrors, ValidationErrors } from '../types'
import validationErrorsToString from './validationErrorsToString'
import * as chalk from 'chalk'
import { error } from '@oclif/core/lib/errors'

export default function handleTemplateError (themePath: string, templateErrors: TemplateErrors) {
  // The theming endpoints key these by template identifier (e.g. `home_page`).
  // `validationErrorsToString` expects a path-keyed shape, so we convert here.
  const validationErrors: ValidationErrors = {}
  for (const [identifier, errors] of Object.entries(templateErrors)) {
    validationErrors[`templates/${identifier}.hbs`] = errors
  }

  const title = `${chalk.bold('InvalidTemplates')} - Template(s) with syntax error(s)`
  const details = validationErrorsToString(themePath, validationErrors)

  error(`${title}\n${details}`)
}
