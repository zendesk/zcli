import { Command } from '@oclif/command'
import * as fs from 'fs-extra'
import * as path from 'path'
import * as chalk from 'chalk'
import { createAppPkg, validatePkg } from '../../lib/package'
import { validateAppPath } from '../../lib/appPath'

export default class Validate extends Command {
  static description = 'validates your app'

  static args = [
    { name: 'appDirectory', default: '.', required: true, description: 'app path where manifest.json exists' }
  ]

  static examples = [
    '$ zcli apps:validate .',
    '$ zcli apps:validate ./app1'
  ]

  async run () {
    const { args } = this.parse(Validate)
    const { appDirectory } = args

    const appPath = path.resolve(appDirectory)
    validateAppPath(appPath)
    const pkgPath = await createAppPkg(appPath)

    try {
      await validatePkg(pkgPath)
      this.log(chalk.green('No validation errors'))
    } catch (error) {
      this.error(chalk.red(error))
    }

    // clean up
    if (pkgPath) await fs.remove(pkgPath)
  }
}
