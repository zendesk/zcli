import { CliUx } from '@oclif/core'
import * as fs from 'fs'
import * as archiver from 'archiver'

type CreateThemePackage = {
  readStream: fs.ReadStream,
  removePackage: () => void
}

export const createZipArchive = () => archiver('zip')

export default async function createThemePackage (themePath: string): Promise<CreateThemePackage> {
  CliUx.ux.action.start('Creating theme package')

  const dateTimeFileName = new Date().toISOString().replace(/[^0-9]/g, '')
  const pkgName = `theme-${dateTimeFileName}`
  const pkgPath = `${themePath}/${pkgName}.zip`
  const output = fs.createWriteStream(pkgPath)
  const archive = createZipArchive()

  archive.pipe(output)

  archive.directory(`${themePath}/assets`, `${pkgName}/assets`)
  archive.directory(`${themePath}/settings`, `${pkgName}/settings`)
  archive.directory(`${themePath}/templates`, `${pkgName}/templates`)
  archive.directory(`${themePath}/translations`, `${pkgName}/translations`)
  archive.file(`${themePath}/manifest.json`, { name: `${pkgName}/manifest.json` })
  archive.file(`${themePath}/script.js`, { name: `${pkgName}/script.js` })
  archive.file(`${themePath}/style.css`, { name: `${pkgName}/style.css` })
  archive.file(`${themePath}/thumbnail.png`, { name: `${pkgName}/thumbnail.png` })

  await archive.finalize()

  CliUx.ux.action.stop('Ok')

  return {
    readStream: fs.createReadStream(pkgPath),
    removePackage: () => fs.unlinkSync(pkgPath)
  }
}
