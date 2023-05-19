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

export default async function preview (themePath: string, flags: Flags): Promise<void> {
  const manifest = getManifest(themePath)
  const templates = getTemplates(themePath)
  const variables = getVariables(themePath, manifest.settings, flags)
  const assets = getAssets(themePath, flags)
  const { bind: host, port, livereload } = flags

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
    await request.requestAPI('/hc/api/internal/theming/local_preview', {
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
            <link rel="stylesheet" href="http://${host}:${port}/guide/style.css">
            ${templates.document_head}
            <script src="http://${host}:${port}/guide/script.js"></script>
            ${livereload ? livereloadScript(host, port) : ''}
          `,
          assets: assetsPayload,
          variables: variablesPayload,
          metadata: metadataPayload
        }
      },
      validateStatus: (status: number) => status === 200
    })
    CliUx.ux.action.stop('Ok')
  } catch (e) {
    CliUx.ux.action.stop(chalk.bold.red('!'))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { template_errors } = (e as any).response.data
    if (template_errors) {
      handlePreviewError(themePath, template_errors)
    } else {
      error('Something went wrong')
    }
  }
}

export function livereloadScript (host: string, port: number) {
  return `<script>(() => {
    const socket = new WebSocket('ws://${host}:${port}/livereload');
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
