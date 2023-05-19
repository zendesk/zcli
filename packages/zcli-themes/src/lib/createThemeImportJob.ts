import type { PendingJob } from '../types'
import { CliUx } from '@oclif/core'
import { request } from '@zendesk/zcli-core'
import * as chalk from 'chalk'
import * as axios from 'axios'
import { CLIError, error } from '@oclif/core/lib/errors'

export default async function createThemeImportJob (brandId: string): Promise<PendingJob> {
  CliUx.ux.action.start('Creating theme import job')

  try {
    const { data: { job } } = await request.requestAPI('/api/v2/guide/theming/jobs/themes/imports', {
      method: 'POST',
      headers: {
        'X-Zendesk-Request-Originator': 'zcli themes:import'
      },
      data: {
        job: {
          attributes: {
            brand_id: brandId,
            format: 'zip'
          }
        }
      },
      validateStatus: (status: number) => status === 202
    })
    CliUx.ux.action.stop('Ok')
    return job
  } catch (e) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const errors = (e as any).response.data.errors
    for (const { code, title } of errors) {
      error(`${chalk.bold(code)} - ${title}`)
    }

    error(new CLIError(e as axios.AxiosError))
  }
}
