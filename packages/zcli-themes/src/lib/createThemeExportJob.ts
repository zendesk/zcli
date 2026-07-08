import type { ExportJob } from '../types'
import { CliUx } from '@oclif/core'
import { request } from '@zendesk/zcli-core'
import type { AxiosError } from 'axios'
import handleThemeApiError from './handleThemeApiError'

export default async function createThemeExportJob (themeId: string): Promise<ExportJob> {
  CliUx.ux.action.start('Creating theme export job')

  try {
    const { data: { job } } = await request.requestAPI('/api/v2/guide/theming/jobs/themes/exports', {
      method: 'POST',
      headers: {
        'X-Zendesk-Request-Originator': 'zcli themes:export'
      },
      data: {
        job: {
          attributes: {
            theme_id: themeId,
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
