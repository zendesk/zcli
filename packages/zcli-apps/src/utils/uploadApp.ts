import { setConfig } from '../utils/appConfig'
import { request } from '@zendesk/zcli-core'

export const getUploadJobStatus = async (job_id: string, appPath: string, pollAfter = 1000) => new Promise((resolve, reject) => {
  const polling = setInterval(async () => {
    const res = await request.requestAPI(`api/v2/apps/job_statuses/${job_id}`)
    const { status, message, app_id } = await res.json()

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
