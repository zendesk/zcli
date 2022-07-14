import { setConfig } from '../utils/appConfig'
import { request } from '@zendesk/zcli-core'
import { getAppSettings } from './getAppSettings'
import { Manifest, Installations, ZcliConfigFileContent } from '../types'

export const getUploadJobStatus = async (job_id: string, appPath: string, pollAfter = 1000) => new Promise((resolve, reject) => {
  const polling = setInterval(async () => {
    const res = await request.requestAPI(`api/v2/apps/job_statuses/${job_id}`, { method: 'GET' })
    const { status, message, app_id } = await res.data

    if (status === 'completed') {
      clearInterval(polling)
      setConfig('app_id', app_id, appPath)
      resolve({ status, message, app_id })
    } else if (status === 'failed') {
      clearInterval(polling)
      reject(message)
    }
  }, pollAfter)
})

export const updateProductInstallation = async (appConfig: ZcliConfigFileContent, manifest: Manifest, app_id: string, product: string): Promise<boolean> => {
  const installationResp = await request.requestAPI(`/api/${product}/apps/installations.json`, {}, true)
  const installations: Installations = installationResp.data

  const configParams = appConfig?.parameters || {} // if there are no parameters in the config, just attach an empty object
  const settings = manifest.parameters ? await getAppSettings(manifest, configParams) : {}
  const installation_id = installations.installations.filter(i => i.app_id === app_id)[0].id

  const updated = await request.requestAPI(`/api/${product}/apps/installations/${installation_id}.json`, {
    method: 'PUT',
    data: JSON.stringify({ settings: { name: manifest.name, ...settings } }),
    headers: {
      'Content-Type': 'application/json'
    }
  })

  if (updated.status === 201 || updated.status === 200) {
    return true
  } else {
    return false
  }
}
