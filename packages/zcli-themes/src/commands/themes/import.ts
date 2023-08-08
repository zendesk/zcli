import { Command, Flags } from '@oclif/core'
import * as path from 'path'
import * as chalk from 'chalk'
import createThemeImportJob from '../../lib/createThemeImportJob'
import getBrandId from '../../lib/getBrandId'
import createThemePackage from '../../lib/createThemePackage'
import uploadThemePackage from '../../lib/uploadThemePackage'
import pollJobStatus from '../../lib/pollJobStatus'

export default class Import extends Command {
  static description = 'import a theme'

  static enableJsonFlag = true

  static flags = {
    brandId: Flags.string({ description: 'The id of the brand where the theme should be imported to' })
  }

  static args = [
    { name: 'themeDirectory', required: true, default: '.' }
  ]

  static examples = [
    '$ zcli themes:import ./copenhagen_theme',
    '$ zcli themes:import ./copenhagen_theme --brandId=123456'
  ]

  static strict = false

  async run () {
    let { flags: { brandId }, argv: [themeDirectory] } = await this.parse(Import)
    const themePath = path.resolve(themeDirectory)

    brandId = brandId || await getBrandId()

    const job = await createThemeImportJob(brandId)
    const { readStream, removePackage } = await createThemePackage(themePath)

    try {
      await uploadThemePackage(job, readStream)
    } finally {
      removePackage()
    }

    await pollJobStatus(themePath, job.id)

    const themeId = job.data.theme_id

    this.log(chalk.green('Theme imported successfully'), `theme ID: ${themeId}`)

    return { themeId }
  }
}
