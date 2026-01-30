import type { Flags, ValidationErrors } from '../types'
import getManifest from './getManifest'
import getTemplates from './getTemplates'
import getVariables from './getVariables'
import getAssets from './getAssets'
import * as chalk from 'chalk'
import { request } from '@zendesk/zcli-core'
import { error } from '@oclif/core/lib/errors'
import { CliUx } from '@oclif/core'
import type { AxiosError } from 'axios'
import rewriteTemplates from './rewriteTemplates'
import rewriteManifest from './rewriteManifest'
import handleTemplateError from './handleTemplateError'
import parseAxiosError from './parseAxiosError'

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
    const { data } = await request.requestAPI('/hc/api/internal/theming/migrations', {
      method: 'POST',
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
  } catch (e) {
    CliUx.ux.action.stop(chalk.bold.red('!'))
    const { message, response } = parseAxiosError(e as AxiosError)

    if (response) {
      const { template_errors: templateErrors, general_error: generalError } =
        response.data as {
          template_errors: ValidationErrors;
          general_error: string;
        }
      if (templateErrors) handleTemplateError(themePath, templateErrors)
      else if (generalError) error(generalError)
      else error(message)
    } else {
      error(e as AxiosError)
    }
  }
}
