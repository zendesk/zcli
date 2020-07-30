import { Command } from '@oclif/command'
import { cleanDirectory } from '../../utils/fileUtils'
import * as path from 'path'
import * as chalk from 'chalk'
import { validateAppPath } from '../../lib/appPath'

export default class Clean extends Command {
  static description = 'purges any app artifacts which have been generated locally'

  static args = [
    { name: 'appPath' }
  ]

  static examples = [
    '$ zcli apps:clean ./app'
  ]

  async run () {
    const tmpDirectoryPath = path.join(process.cwd(), 'tmp')
    const { args } = this.parse(Clean)
    const appPath = args.appPath || './'

    validateAppPath(appPath)

    try {
      await cleanDirectory(tmpDirectoryPath)
      this.log(chalk.green(`Successfully removed ${tmpDirectoryPath} directory.`))
    } catch (error) {
      this.error(chalk.red(`Failed to remove ${tmpDirectoryPath} directory.`))
    }
  }
}
