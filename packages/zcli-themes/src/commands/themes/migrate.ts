import { Command, Flags, CliUx } from '@oclif/core'
import * as path from 'path'
import * as chalk from 'chalk'
import getManifest from '../../lib/getManifest'
import migrate from '../../lib/migrate'
import migrateNoBackwards from '../../lib/migrateNoBackwards'

export default class Migrate extends Command {
  static description = 'migrate a theme to the latest api_version'

  static enableJsonFlag = true

  static flags = {
    backwardCompatible: Flags.boolean({ default: false, description: 'Use the new api but keep existing functionality and customizations', allowNo: true })
  }

  static args = [
    { name: 'themeDirectory', required: true, default: '.' }
  ]

  static examples = [
    '$ zcli themes:migrate ./copenhagen_theme --backwardCompatible'
  ]

  static strict = false

  async run () {
    const { flags, argv: [themeDirectory] } = await this.parse(Migrate)
    const { backwardCompatible } = flags
    const themePath = path.resolve(themeDirectory)
    const manifest = getManifest(themePath)

    const { api_version: apiVersion } = manifest

    try {
      CliUx.ux.action.start('Migrating theme')
      switch (apiVersion) {
      case 1:
      case 2: {
        this.log(chalk.green('Migration from version 1 and 2 coming soon'))
        break
      }
      case 3: {
        if (backwardCompatible) {
          migrate(themePath)
        } else {
          this.log(chalk.green('Migrating version 3 without backward compatibility'))

          migrateNoBackwards(themePath, manifest)
        }

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
