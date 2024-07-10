import type { Flags, ValidationError, ValidationErrors } from '../types'
import getManifest from './getManifest'
import getTemplates from './getTemplates'
import getVariables from './getVariables'
import getAssets from './getAssets'
import * as chalk from 'chalk'
import { request } from '@zendesk/zcli-core'
import { error } from '@oclif/core/lib/errors'
import { CliUx } from '@oclif/core'
import validationErrorsToString from './validationErrorsToString'
import { getLocalServerBaseUrl } from './getLocalServerBaseUrl'
import type { AxiosError } from 'axios'

export default async function preview (themePath: string, flags: Flags): Promise<string | void> {
  const manifest = getManifest(themePath)
  const templates = getTemplates(themePath)
  const variables = getVariables(themePath, manifest.settings, flags)
  const assets = getAssets(themePath, flags)
  const { livereload } = flags

  const variablesPayload = variables.reduce((payload, variable) => ({
    ...payload,
    [variable.identifier]: variable.value
  }), {})

  const assetsPayload = assets.reduce((payload, [parsedPath, url]) => ({
    ...payload,
    [parsedPath.base]: url
  }), {})

  const metadataPayload = { api_version: manifest.api_version }

  try {
    CliUx.ux.action.start('Uploading theme')
    const { config: { baseURL } } = await request.requestAPI('/hc/api/internal/theming/local_preview', {
      method: 'put',
      headers: {
        'X-Zendesk-Request-Originator': 'zcli themes:preview'
      },
      data: {
        templates: {
          ...templates,
          css: '',
          js: '',
          document_head: `
            <link rel="stylesheet" href="${getLocalServerBaseUrl(flags)}/guide/style.css">
            ${templates.document_head}
            <script src="${getLocalServerBaseUrl(flags)}/guide/script.js"></script>
            ${livereload ? livereloadScript(flags) : ''}
          `,
          assets: assetsPayload,
          variables: variablesPayload,
          metadata: metadataPayload
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
      const {
        template_errors: templateErrors,
        general_error: generalError
      } = response.data as {
          template_errors: ValidationErrors,
          general_error: string
        }
      if (templateErrors) handlePreviewError(themePath, templateErrors)
      else if (generalError) error(generalError)
      else error(message)
    } else {
      error(e as AxiosError)
    }
  }
}

export function livereloadScript (flags: Flags) {
  return `<script>(() => {
    const socket = new WebSocket('${getLocalServerBaseUrl(flags, true)}/livereload');
    socket.onopen = () => console.log('Listening to theme changes...');
    socket.onmessage = e => e.data === 'reload' && location.reload();
  })()</script>
  `
}

function handlePreviewError (themePath: string, templateErrors: ValidationErrors) {
  const validationErrors: ValidationErrors = {}
  for (const [template, errors] of Object.entries(templateErrors)) {
    // the preview endpoint returns the template identifier as the 'key' instead of
    // the template path. We must fix this so we can reuse `validationErrorsToString`
    // and align with the job import error handling
    validationErrors[`templates/${template}.hbs`] = errors as ValidationError[]
  }

  const title = `${chalk.bold('InvalidTemplates')} - Template(s) with syntax error(s)`
  const details = validationErrorsToString(themePath, validationErrors)

  error(`${title}\n${details}`)
}
