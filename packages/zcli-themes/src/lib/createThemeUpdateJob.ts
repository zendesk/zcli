import type { PendingJob } from '../types'
import { CliUx } from '@oclif/core'
import { request } from '@zendesk/zcli-core'
import type { AxiosError } from 'axios'
import handleThemeApiError from './handleThemeApiError'

export default async function createThemeUpdateJob (themeId: string, replaceSettings: boolean): Promise<PendingJob> {
  CliUx.ux.action.start('Creating theme update job')

  try {
    const { data: { job } } = await request.requestAPI('/api/v2/guide/theming/jobs/themes/updates', {
      method: 'POST',
      headers: {
        'X-Zendesk-Request-Originator': 'zcli themes:update'
      },
      data: {
        job: {
          attributes: {
            theme_id: themeId,
            replace_settings: replaceSettings,
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
