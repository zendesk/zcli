import type { MigrateResponse, MigrationReport } from '../types'
import getManifest from './getManifest'
import getTemplates from './getTemplates'
import getVariables from './getVariables'
import getAssets from './getAssets'
import { request } from '@zendesk/zcli-core'
import rewriteTemplates from './rewriteTemplates'
import rewriteManifest from './rewriteManifest'
import rewriteAssets from './rewriteAssets'

export default async function migrate (themePath: string): Promise<MigrationReport> {
  const manifest = getManifest(themePath)
  const templates = getTemplates(themePath)
  const variables = getVariables(themePath, manifest.settings)
  const assets = getAssets(themePath)

  const variablesPayload = variables.reduce((payload, variable) => ({
    ...payload,
    [variable.identifier]: variable.value
  }), {})

  const assetsPayload = assets.reduce((payload, [parsedPath, url]) => ({
    ...payload,
    [parsedPath.base]: url
  }), {})

  const metadataPayload = { api_version: manifest.api_version }

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

  const response = data as MigrateResponse
  rewriteManifest(themePath, response.metadata.api_version)
  rewriteTemplates(themePath, response.templates)
  rewriteAssets(themePath, response.assets)
  return response.migration_report
}
