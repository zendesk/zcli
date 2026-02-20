import * as fs from 'fs'
import { join } from 'path'
import * as archiver from 'archiver'
import { request } from '@zendesk/zcli-core'

export async function createPackageArchive (
  path: string,
  connectorName: string
): Promise<string> {
  const packageFileName = `${connectorName}.zip`
  const packagePath = join(path, packageFileName)

  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(packagePath)
    const archive = archiver('zip', {
      zlib: { level: 9 }
    })

    output.on('close', () => {
      resolve(packagePath)
    })
    output.on('error', (err: Error) => {
      reject(err)
    })
    archive.on('error', (err: Error) => {
      reject(err)
    })

    archive.pipe(output)
    archive.directory(path, false)
    archive.glob('**/*', {
      cwd: path,
      ignore: [packageFileName]
    })
    archive.finalize()
  })
}

export async function cleanupPackageArchive (archivePath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!archivePath) {
      resolve()
      return
    }

    fs.unlink(archivePath, (err) => {
      if (err) {
        if (err.code === 'ENOENT') {
          // File doesn't exist, treat as success
          resolve()
        } else {
          reject(err)
        }
      } else {
        resolve()
      }
    })
  })
}

export async function createConnector (path: string): Promise<{ uploadUrl: string; connectorName: string }> {
  const manifestPath = join(path, 'manifest.json')
  const manifestContent = fs.readFileSync(manifestPath, 'utf-8')
  const manifest = JSON.parse(manifestContent)

  const connectorName = manifest.name
  const connectorVersion = manifest.version

  if (!connectorName || !connectorVersion) {
    throw new Error('Connector name and version are required in manifest.json')
  }

  const response = await request.requestAPI('/flowstate/connectors/private/create', {
    method: 'POST',
    data: {
      connector_name: connectorName,
      version: connectorVersion
    }
  })

  if (response.status !== 201) {
    throw new Error(`API returned status ${response.status} - ${JSON.stringify(response.data)}`)
  }

  return {
    uploadUrl: response.data.upload_url,
    connectorName
  }
}

export async function uploadConnectorPackage (
  path: string,
  uploadUrl: string,
  connectorName: string
): Promise<void> {
  if (!connectorName) {
    throw new Error('Connector name is required')
  }

  const packagePath = await createPackageArchive(path, connectorName)

  try {
    const packageContent = fs.readFileSync(packagePath)

    const response = await request.requestRaw(uploadUrl, {
      method: 'PUT',
      headers: {
        'x-amz-server-side-encryption': 'AES256'
      },
      data: packageContent
    })

    if (response.status !== 200) {
      throw new Error(`Upload failed with status ${response.status} - ${JSON.stringify(response.data)}`)
    }
  } finally {
    await cleanupPackageArchive(packagePath)
  }
}
