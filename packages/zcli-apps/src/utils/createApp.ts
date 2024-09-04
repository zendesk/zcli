import * as fs from 'fs-extra'
import { Dictionary, Manifest, ManifestParameter } from '../types'
import * as FormData from 'form-data'
import { getManifestFile } from '../utils/manifest'
import { request } from '@zendesk/zcli-core'
import { CliUx } from '@oclif/core'
import * as chalk from 'chalk'
import * as path from 'path'

export const getManifestAppName = (appPath: string): string | undefined => {
  return getManifestFile(appPath).name
}

export const uploadAppPkg = async (pkgPath: string): Promise<any> => {
  const pkgBuffer = await fs.readFile(pkgPath)

  const formData = new FormData()
  formData.append('uploaded_data', pkgBuffer, {
    filename: path.basename(pkgPath),
    contentType: 'application/zip'
  })

  const response = await request.requestAPI('api/v2/apps/uploads.json', {
    method: 'POST',
    data: formData.getBuffer(),
    headers: formData.getHeaders()
  })

  // clean up
  await fs.remove(pkgPath)
  if (response.status !== 201) {
    console.log(chalk.red('Upload failed with response: ', response.data))
  }

  return response.data
}

export const promptAndGetSettings = async (params: ManifestParameter[], appName = 'app', valuesRequired = true) => {
  const settings: Dictionary<string> = {}
  for (const param of params) {
    const value = await CliUx.ux.prompt(`Enter ${appName} setting.${param.name} value`, { type: param.secure ? 'hide' : 'normal', required: valuesRequired })
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
    data: JSON.stringify(installationPayload),
    method,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    }
  }
  const installationResponse = await request.requestAPI(url, installationOptions)
  return installationResponse.data
}

export const createProductInstallation = async (settings: any, manifest: Manifest, app_id: string, product: string): Promise<boolean> => {
  const installResponse = await request.requestAPI(`api/${product}/apps/installations.json`, {
    method: 'POST',
    data: JSON.stringify({ app_id: `${app_id}`, settings: { name: manifest.name, ...settings } }),
    headers: {
      'Content-Type': 'application/json'
    }
  })
  if (installResponse.status === 201 || installResponse.status === 200) {
    return true
  } else {
    return false
  }
}
