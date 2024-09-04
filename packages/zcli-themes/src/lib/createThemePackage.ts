import { CliUx } from '@oclif/core'
import * as fs from 'fs'
import * as archiver from 'archiver'

type CreateThemePackage = {
  file: Buffer,
  removePackage: () => void
}

export const createZipArchive = (pkgPath: string, themePath: string, pkgName: string) => {
  const archive = archiver('zip')

  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(pkgPath)

    output.on('error', (err) => {
      reject(err)
    })

    output.on('close', () => {
      resolve(archive)
    })

    archive.directory(`${themePath}/assets`, `${pkgName}/assets`)
    archive.directory(`${themePath}/settings`, `${pkgName}/settings`)
    archive.directory(`${themePath}/templates`, `${pkgName}/templates`)
    archive.directory(`${themePath}/translations`, `${pkgName}/translations`)
    archive.file(`${themePath}/manifest.json`, { name: `${pkgName}/manifest.json` })
    archive.file(`${themePath}/script.js`, { name: `${pkgName}/script.js` })
    archive.file(`${themePath}/style.css`, { name: `${pkgName}/style.css` })
    archive.file(`${themePath}/thumbnail.png`, { name: `${pkgName}/thumbnail.png` })

    archive.pipe(output)

    archive.finalize()
  })
}

export default async function createThemePackage (themePath: string): Promise<CreateThemePackage> {
  CliUx.ux.action.start('Creating theme package')

  const dateTimeFileName = new Date().toISOString().replace(/[^0-9]/g, '')
  const pkgName = `theme-${dateTimeFileName}`
  const pkgPath = `${themePath}/${pkgName}.zip`

  await createZipArchive(pkgPath, themePath, pkgName)

  CliUx.ux.action.stop('Ok')

  return {
    file: fs.readFileSync(pkgPath),
    removePackage: () => fs.unlinkSync(pkgPath)
  }
}
