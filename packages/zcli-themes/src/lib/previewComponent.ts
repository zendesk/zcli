import type { Flags } from '../types'
import getComponent from './getComponent'
import * as chalk from 'chalk'
import { request } from '@zendesk/zcli-core'
import { error } from '@oclif/core/lib/errors'
import { CliUx } from '@oclif/core'
import { getLocalServerBaseUrl } from './getLocalServerBaseUrl'
import type { AxiosError } from 'axios'

export default async function previewComponent (componentPath: string, flags: Flags): Promise<string | void> {
  const component = getComponent(componentPath)

  const src = `${getLocalServerBaseUrl(flags)}/theme_components/${component.name}/${component.version}/index.js`

  try {
    CliUx.ux.action.start('Registering component')
    const { config: { baseURL } } = await request.requestAPI('/hc/api/internal/theming/local_preview/theme_components', {
      method: 'put',
      headers: {
        'X-Zendesk-Request-Originator': 'zcli themes:preview'
      },
      data: {
        theme_components: {
          [component.name]: {
            version: component.version,
            src,
            settings: component.settings || [],
            data_requirements: component.data_requirements || {}
          }
        }
      },
      validateStatus: (status: number) => status === 200
    })
    CliUx.ux.action.stop('Ok')
    return baseURL
  } catch (e) {
    CliUx.ux.action.stop(chalk.bold.red('!'))
    const { response, message } = e as AxiosError
    if (response) {
      const { general_error: generalError } = response.data as { general_error: string }
      if (generalError) error(generalError)
      else if (response.status === 404) error('Component preview is not supported by this Zendesk account: the help_center theme_components endpoint is missing')
      else error(message)
    } else {
      error(e as AxiosError)
    }
  }
}
