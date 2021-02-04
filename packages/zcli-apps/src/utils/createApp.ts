import * as fs from 'fs-extra'
import { Dictionary, ManifestParameter } from '../types'
import * as FormData from 'form-data'
import { getManifestFile } from '../utils/manifest'
import { request } from '@zendesk/zcli-core'
import cli from 'cli-ux'

export const getManifestAppName = (appPath: string): string | undefined => {
  return getManifestFile(appPath).name
}

export const uploadAppPkg = async (pkgPath: string): Promise<any> => {
  const formData = new FormData()
  const pkgBuffer = fs.createReadStream(pkgPath)
  formData.append('uploaded_data', pkgBuffer)
  const response = await request.requestAPI('api/v2/apps/uploads.json', {
    body: formData,
    method: 'POST'
  })

  // clean up
  await fs.remove(pkgPath)

  return response.json()
}

export const promptAndGetSettings = async (params: ManifestParameter[], appName = 'app', valuesRequired = true) => {
  const settings: Dictionary<string> = {}
  for (const param of params) {
    const value = await cli.prompt(`Enter ${appName} setting.${param.name} value`, { type: param.secure ? 'hide' : 'normal', required: valuesRequired })
    if (value) settings[param.name] = value
  }
  return settings
}

export const deployApp = async (method: string, url: string, upload_id: number, appName?: string): Promise<Dictionary<string>> => {
  let installationPayload
  if (appName) {
    installationPayload = { upload_id, name: appName }
  } else {
    installationPayload = { upload_id }
  }
  const installationOptions = {
    body: JSON.stringify(installationPayload),
    method,
    headers: {
      'Content-Type': 'application/json'
    }
  }
  const installationResponse = await request.requestAPI(url, installationOptions)
  return installationResponse.json()
}
