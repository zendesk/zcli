import type { AxiosError, AxiosResponse } from 'axios'
import * as chalk from 'chalk'
import { error } from '@oclif/core/lib/errors'

export default function handleThemeApiError (e: any): never {
  if (e instanceof RequestError) {
    const { response, message } = e

    if (response) {
      const { errors } = response
      for (const { code, title } of errors) {
        error(`${chalk.bold(code)} - ${title}`)
      }
    }

    error(message)
  } else {
    error(e.message || 'An unknown error occurred')
  }

  throw e
}

class RequestError extends Error {
  public response: any

  constructor (message: string, response?: any) {
    super(message)
    this.response = response
  }
}
