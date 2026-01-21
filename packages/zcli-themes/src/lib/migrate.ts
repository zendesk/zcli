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
import type { AxiosError } from 'axios'
import rewriteTemplates from './rewriteTemplates'
import rewriteManifest from './rewriteManifest'

export default async function migrate (themePath: string, flags: Flags): Promise<string | void> {
  const manifest = getManifest(themePath)
  const templates = getTemplates(themePath)
  const variables = getVariables(themePath, manifest.settings, flags)
  const assets = getAssets(themePath, flags)

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
    CliUx.ux.action.start('Migrating theme')
    const { data } = await request.requestAPI('/hc/api/internal/theming/migrate', {
      method: 'put',
      headers: {
        'X-Zendesk-Request-Originator': 'zcli themes:migrate'
      },
      data: {
        templates: {
          ...templates,
          assets: assetsPayload,
          variables: variablesPayload,
          metadata: metadataPayload
        }
      },
      validateStatus: (status: number) => status === 200
    })
    rewriteManifest(themePath, data.metadata.api_version)
    rewriteTemplates(themePath, data.templates)
    CliUx.ux.action.stop('Ok')
    return 'result'
  } catch (e) {
    console.log(e)
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
