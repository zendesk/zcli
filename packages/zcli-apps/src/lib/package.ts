import * as path from 'path'
import * as fs from 'fs-extra'
import { request } from '@zendesk/zcli-core'
import { CLIError } from '@oclif/core/lib/errors'
import * as archiver from 'archiver'
import { validateAppPath } from './appPath'
import * as FormData from 'form-data'

const getDateTimeFileName = () => (new Date()).toISOString().replace(/[^0-9]/g, '')

export const createAppPkg = (
  relativeAppPath: string,
  pkgDir = 'tmp'
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const appPath = path.resolve(relativeAppPath)
    validateAppPath(appPath)

    const pkgName = `app-${getDateTimeFileName()}`
    const pkgPath = `${appPath}/${pkgDir}/${pkgName}.zip`

    fs.ensureDirSync(`${appPath}/${pkgDir}`)
    const output = fs.createWriteStream(pkgPath)

    output.on('close', () => {
      resolve(pkgPath)
    })

    output.on('error', (err) => {
      reject(err)
    })

    const archive = archiver('zip')

    let archiveIgnore = ['tmp/**']

    if (fs.pathExistsSync(`${appPath}/.zcliignore`)) {
      archiveIgnore = archiveIgnore.concat(fs.readFileSync(`${appPath}/.zcliignore`).toString().replace(/\r\n/g, '\n').split('\n').filter((item) => {
        return (item.trim().startsWith('#') ? null : item.trim())
      }))
    }

    archive.glob('**', {
      cwd: appPath,
      ignore: archiveIgnore
    })

    archive.pipe(output)

    archive.finalize()

    return pkgPath
  })
}

export const validatePkg = async (pkgPath: string) => {

  if (!fs.pathExistsSync(pkgPath)) {
    throw new CLIError(`Package not found at ${pkgPath}`)
  }

  const file = await fs.readFile(pkgPath)

  const form = new FormData()
  form.append('file', file, {
    filename: path.basename(pkgPath)
  })

  const res = await request.requestAPI('api/v2/apps/validate', {
    method: 'POST',
    data: form.getBuffer(),
    headers: form.getHeaders()
  })

  if (res.status !== 200) {
    throw new CLIError(res.data?.description)
  }

  return true
}
