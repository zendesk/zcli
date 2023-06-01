import type { Job, JobError, ValidationErrors } from '../types'
import { CliUx } from '@oclif/core'
import { error } from '@oclif/core/lib/errors'
import { request } from '@zendesk/zcli-core'
import * as chalk from 'chalk'
import validationErrorsToString from './validationErrorsToString'

export default async function pollJobStatus (themePath: string, jobId: string, interval = 1000, retries = 10): Promise<void> {
  CliUx.ux.action.start('Polling job status')

  while (retries) {
    // Delay issuing a retry
    await new Promise(resolve => setTimeout(resolve, interval))

    const response = await request.requestAPI(`/api/v2/guide/theming/jobs/${jobId}`)
    const job: Job = response.data.job

    switch (job.status) {
    case 'pending':
      retries -= 1
      break
    case 'completed': {
      CliUx.ux.action.stop('Ok')
      return
    }
    case 'failed': {
      // Although `data.job.errors` is an array, it usually contains
      // only one error at a time. Hence, we only need to handle the
      // first error in the array.
      const [error] = job.errors
      handleJobError(themePath, error)
    }
    }
  }

  error('Import job timed out')
}

function handleJobError (themePath: string, jobError: JobError): void {
  const { code, message, meta } = jobError
  const title = `${chalk.bold(code)} - ${message}`
  let details = ''

  switch (code) {
  case 'InvalidTemplates':
  case 'InvalidManifest':
  case 'InvalidTranslationFile':
    details = validationErrorsToString(themePath, meta as ValidationErrors)
    break
  default:
    details = JSON.stringify(meta)
  }

  error(`${title}\n${details}`)
}
