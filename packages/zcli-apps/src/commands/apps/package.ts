import { Command } from '@oclif/command'
import * as path from 'path'
import * as chalk from 'chalk'
import { createAppPkg, validatePkg } from '../../lib/package'
import { validateAppPath } from '../../lib/appPath'

export default class Package extends Command {
  static description = 'validates and packages your app'

  static args = [
    { name: 'appDirectory', default: '.', required: true, description: 'app path where manifest.json exists' }
  ]

  static examples = [
    '$ zcli apps:package .',
    '$ zcli apps:package ./app1'
  ]

  async run () {
    const { args } = this.parse(Package)
    const { appDirectory } = args

    const appPath = path.resolve(appDirectory)
    validateAppPath(appPath)
    const pkgPath = await createAppPkg(appPath)

    try {
      await validatePkg(pkgPath)
      this.log(chalk.green(`Package created at ${path.relative(process.cwd(), pkgPath)}`))
    } catch (error) {
      this.error(chalk.red(error))
    }
  }
}
