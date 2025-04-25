import type { AxiosError, AxiosResponse } from 'axios'
import * as chalk from 'chalk'
import { error } from '@oclif/core/lib/errors'

export default function handleThemeApiError (e: AxiosError): never {
  const { response, message } = e

  if (response?.data) {
    const { errors } = (response as AxiosResponse).data
    for (const { code, title } of errors) {
      error(`${chalk.bold(code)} - ${title}`)
    }
  } else if (message) {
    error(message)
  }

  error(e)
}
