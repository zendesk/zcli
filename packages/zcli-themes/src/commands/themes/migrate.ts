import { Command, Flags, CliUx } from '@oclif/core'
import * as path from 'path'
import * as chalk from 'chalk'
import { CLIError } from '@oclif/core/lib/errors'
import getManifest from '../../lib/getManifest'

export default class Migrate extends Command {
  static description = 'migrate a theme to the latest api_version'

  static enableJsonFlag = true

  static flags = {
    backwardCompatible: Flags.boolean({ default: true, description: 'Use the new api but keep existing functionality and customizations', allowNo: true })
  }

  static args = [
    { name: 'themeDirectory', required: true, default: '.' }
  ]

  static examples = [
    '$ zcli themes:migrate --backwardCompatible=false'
  ]

  static strict = false

  async run () {
    const { flags: { backwardCompatible }, argv: [themeDirectory] } = await this.parse(Migrate)
    const themePath = path.resolve(themeDirectory)
    const { api_version: apiVersion } = getManifest(themePath)

    try {
      CliUx.ux.action.start('Migrating theme')
      switch (apiVersion) {
      case 1:
      case 2: {
        this.log(chalk.green('Migration from version 1 and 2 coming soon'))
        break
      }
      case 3: {
        // implement
        break
      }
      case 4: {
        this.log(chalk.green('Theme is already using the latest available api_version'))
        break
      }
      default:
        break
      }
      return {}
    } catch (error) {
      console.log(error)
    }
  }
}
