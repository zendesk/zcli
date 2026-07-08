import { CliUx } from '@oclif/core'
import { request } from '@zendesk/zcli-core'
import { error } from '@oclif/core/lib/errors'
import type { AxiosError } from 'axios'
import * as fs from 'fs'
import * as path from 'path'

export default async function downloadThemePackage (downloadUrl: string, themeId: string, destination: string): Promise<string> {
  CliUx.ux.action.start('Downloading theme package')

  const filePath = path.join(destination, `theme_${themeId}.zip`)

  try {
    // `requestRaw` hits the presigned download URL directly, without the
    // Zendesk `Authorization` header or base URL that `requestAPI` adds.
    const response = await request.requestRaw(downloadUrl, {
      method: 'GET',
      responseType: 'arraybuffer',
      validateStatus: (status: number) => status === 200
    })
    fs.writeFileSync(filePath, Buffer.from(response.data))
    CliUx.ux.action.stop('Ok')
    return filePath
  } catch (e) {
    error(e as AxiosError)
  }
}
