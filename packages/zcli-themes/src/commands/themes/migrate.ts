import { Command, CliUx } from '@oclif/core'
import * as path from 'path'
import * as chalk from 'chalk'
import type { AxiosError } from 'axios'
import migrate from '../../lib/migrate'
import migrationReportToString from '../../lib/migrationReportToString'
import handleThemeMigrationApiError from '../../lib/handleThemeMigrationApiError'

export default class Migrate extends Command {
  static description = 'migrate theme to the latest version of the templating api'

  static args = [
    { name: 'themeDirectory', required: true, default: '.' }
  ]

  static examples = [
    '$ zcli themes:migrate ./copenhagen_theme'
  ]

  static strict = false

  async run () {
    const { argv: [themeDirectory] } = await this.parse(Migrate)
    const themePath = path.resolve(themeDirectory)

    try {
      CliUx.ux.action.start('Migrating theme')
      const report = await migrate(themePath)
      CliUx.ux.action.stop('Ok')
      this.log(migrationReportToString(report))
    } catch (e) {
      CliUx.ux.action.stop(chalk.bold.red('!'))
      handleThemeMigrationApiError(e as AxiosError, themePath)
    }
  }
}
