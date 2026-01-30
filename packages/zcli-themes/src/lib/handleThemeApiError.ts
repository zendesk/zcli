import type { AxiosError, AxiosResponse } from 'axios'
import * as chalk from 'chalk'
import { error } from '@oclif/core/lib/errors'
import parseAxiosError from './parseAxiosError'

export default function handleThemeApiError (e: AxiosError): never {
  const { message, response } = parseAxiosError(e)

  if (response) {
    const data = (response as AxiosResponse).data

    if (data && typeof data === 'object' && 'errors' in data && Array.isArray(data.errors)) {
      for (const { code, title } of data.errors) {
        error(`${chalk.bold(code)} - ${title}`)
      }
    }
  } else if (message) {
    error(message)
  }

  error(e)
}
