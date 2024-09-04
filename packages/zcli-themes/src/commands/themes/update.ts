import { Command, Flags, CliUx } from '@oclif/core'
import * as path from 'path'
import * as chalk from 'chalk'
import createThemeUpdateJob from '../../lib/createThemeUpdateJob'
import createThemePackage from '../../lib/createThemePackage'
import uploadThemePackage from '../../lib/uploadThemePackage'
import pollJobStatus from '../../lib/pollJobStatus'

export default class Update extends Command {
  static description = 'update a theme'

  static enableJsonFlag = true

  static flags = {
    themeId: Flags.string({ description: 'The id of the theme to update' }),
    replaceSettings: Flags.boolean({ default: false, description: 'Whether or not to replace the current theme settings' })
  }

  static args = [
    { name: 'themeDirectory', required: true, default: '.' }
  ]

  static examples = [
    '$ zcli themes:update ./copenhagen_theme --themeId=123456789100',
    '$ zcli themes:update ./copenhagen_theme --themeId=123456789100 --replaceSettings'
  ]

  static strict = false

  async run () {
    let { flags: { themeId, replaceSettings }, argv: [themeDirectory] } = await this.parse(Update)
    const themePath = path.resolve(themeDirectory)

    themeId = themeId || await CliUx.ux.prompt('Theme ID')

    const job = await createThemeUpdateJob(themeId, replaceSettings)
    const { readFile, removePackage } = await createThemePackage(themePath)

    try {
      await uploadThemePackage(job, readFile, path.basename(themePath))
    } finally {
      removePackage()
    }

    await pollJobStatus(themePath, job.id)

    this.log(chalk.green('Theme updated successfully'))

    return { themeId }
  }
}
