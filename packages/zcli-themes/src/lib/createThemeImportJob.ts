import type { PendingJob } from '../types'
import { CliUx } from '@oclif/core'
import { request } from '@zendesk/zcli-core'
import type { AxiosError } from 'axios'
import handleThemeApiError from './handleThemeApiError'

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
  } catch (error) {
    handleThemeApiError(error as AxiosError)
  }
}
