import { Command, Flags, CliUx } from '@oclif/core'
import * as path from 'path'
import * as chalk from 'chalk'
import createThemeExportJob from '../../lib/createThemeExportJob'
import pollJobStatus from '../../lib/pollJobStatus'
import downloadThemePackage from '../../lib/downloadThemePackage'

export default class Export extends Command {
  static description = 'export a theme'

  static enableJsonFlag = true

  static flags = {
    themeId: Flags.string({ description: 'The id of the theme to export' })
  }

  static args = [
    { name: 'themeDirectory', required: true, default: '.' }
  ]

  static examples = [
    '$ zcli themes:export --themeId=abcd',
    '$ zcli themes:export ./exports --themeId=abcd'
  ]

  static strict = false

  async run () {
    let { flags: { themeId }, argv: [themeDirectory] } = await this.parse(Export)
    const destination = path.resolve(themeDirectory)

    themeId = themeId || await CliUx.ux.prompt('Theme ID')

    const job = await createThemeExportJob(themeId)

    // The download URL is provided when the job is created; the poll only
    // waits for the export to finish (the completed job's `data` is null).
    const downloadUrl = job.data.download.url

    await pollJobStatus(destination, job.id)

    const filePath = await downloadThemePackage(downloadUrl, themeId, destination)

    this.log(chalk.green('Theme exported successfully'), `theme ID: ${themeId}`, filePath)

    return { themeId, path: filePath }
  }
}
