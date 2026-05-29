import * as fs from 'fs'
import * as path from 'path'
import type { MigrateResponse, MigrationReport } from '../types'
import getManifest from './getManifest'
import getTemplates from './getTemplates'
import getVariables from './getVariables'
import getAssets from './getAssets'
import { request } from '@zendesk/zcli-core'
import rewriteTemplates from './rewriteTemplates'
import rewriteManifest from './rewriteManifest'
import rewriteAssets from './rewriteAssets'
import rewriteJsAndCss from './rewriteJsAndCss'

export default async function migrate (themePath: string): Promise<MigrationReport> {
  const manifest = getManifest(themePath)
  const templates = getTemplates(themePath)
  const variables = getVariables(themePath, manifest.settings)
  const assets = getAssets(themePath)
  const css = fs.readFileSync(path.join(themePath, 'style.css'), 'utf8')
  const js = fs.readFileSync(path.join(themePath, 'script.js'), 'utf8')

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
        css,
        js,
        assets: assetsPayload,
        variables: variablesPayload,
        metadata: metadataPayload
      }
    },
    validateStatus: (status: number) => status === 200
  })

  const response = data as MigrateResponse
  const { css: migratedCss, js: migratedJs, ...templateEntries } = response.templates
  rewriteManifest(themePath, response.metadata.api_version)
  rewriteJsAndCss(themePath, { css: migratedCss, js: migratedJs })
  rewriteTemplates(themePath, templateEntries)
  rewriteAssets(themePath, response.assets)
  return response.migration_report
}
