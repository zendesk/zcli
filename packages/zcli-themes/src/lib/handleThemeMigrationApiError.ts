import type { AxiosError } from 'axios'
import { error } from '@oclif/core/lib/errors'
import type { MigrateErrorBody } from '../types'
import parseAxiosError from './parseAxiosError'
import handleTemplateError from './handleTemplateError'

export default function handleThemeMigrationApiError (e: AxiosError, themePath: string): never {
  const { message, response } = parseAxiosError(e)

  if (!response) error(e)

  const status = response.status
  const body = (response.data ?? {}) as MigrateErrorBody
  const { template_errors: templateErrors, general_error: generalError } = body

  if (templateErrors) {
    handleTemplateError(themePath, templateErrors)
  } else if (status >= 500 && generalError) {
    error(`${generalError} Please open an issue at https://github.com/zendesk/zcli/issues/new so we can investigate.`)
  } else if (generalError) {
    error(generalError)
  } else {
    error(message)
  }

  throw new Error('unreachable')
}
