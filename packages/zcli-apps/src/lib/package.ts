import * as path from 'path'
import * as fs from 'fs-extra'
import * as FormData from 'form-data'
import { request } from '@zendesk/zcli-core'
import { CLIError } from '@oclif/core/lib/errors'
import * as archiver from 'archiver'
import { validateAppPath } from './appPath'

const getDateTimeFileName = () => (new Date()).toISOString().replace(/[^0-9]/g, '')

export const createAppPkg = async (
  relativeAppPath: string,
  pkgDir = 'tmp'
) => {
  const appPath = path.resolve(relativeAppPath)
  validateAppPath(appPath)

  const pkgName = `app-${getDateTimeFileName()}`
  const pkgPath = `${appPath}/${pkgDir}/${pkgName}.zip`

  await fs.ensureDir(`${appPath}/${pkgDir}`)
  const output = fs.createWriteStream(pkgPath)
  const archive = archiver('zip')

  archive.pipe(output)

  // ignore tmp dir
  archive.glob('**', {
    cwd: appPath,
    ignore: ['tmp/**']
  })
  await archive.finalize()

  if (!fs.pathExistsSync(pkgPath)) {
    throw new CLIError(`Failed to create package at ${pkgPath}`)
  }

  return pkgPath
}

export const validatePkg = async (pkgPath: string) => {
  if (!fs.pathExistsSync(pkgPath)) {
    throw new CLIError(`Package not found at ${pkgPath}`)
  }

  const form = new FormData()
  form.append('file', fs.createReadStream(pkgPath))
  const res = await request.requestAPI('api/v2/apps/validate', {
    method: 'POST',
    data: form
  })

  if (res.status !== 200) {
    const { description } = await res.data
    throw new CLIError(description)
  }

  return true
}
