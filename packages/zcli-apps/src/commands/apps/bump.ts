import { Command, Flags } from '@oclif/core'
import * as chalk from 'chalk'
import * as semver from 'semver'
import { getManifestFile, updateManifestFile } from '../../utils/manifest'
import { validateAppPath } from '../../lib/appPath'

export default class Bump extends Command {
  static description = 'bumps the version of your app in the manifest file. Accepts major, minor and patch; defaults to patch.'

  static args = [
    { name: 'appPath' }
  ]

  static examples = [
    '$ zcli apps:bump ./repl-app2',
    '$ zcli apps:bump -M ./repl-app2',
    '$ zcli apps:bump -m ./repl-app2',
    '$ zcli apps:bump -p ./repl-app2'
  ]

  static flags = {
    major: Flags.boolean({ char: 'M', description: 'Increments the major version by 1' }),
    minor: Flags.boolean({ char: 'm', description: 'Increments the minor version by 1' }),
    patch: Flags.boolean({ char: 'p', description: 'Increments the patch version by 1' })
  }

  async run () {
    const { args, flags } = await this.parse(Bump)
    const { major, minor } = flags
    const appPath = args.appPath || './'

    validateAppPath(appPath)

    try {
      const manifest = getManifestFile(appPath)
      const version = manifest.version || ''

      if (!semver.valid(version)) {
        this.error(chalk.red(`${manifest.version} is not a valid semantic version`))
      }

      if (major) {
        manifest.version = semver.inc(version, 'major')!
      } else if (minor) {
        manifest.version = semver.inc(version, 'minor')!
      } else {
        manifest.version = semver.inc(version, 'patch')!
      }

      updateManifestFile(appPath, manifest)
      this.log(chalk.green(`Successfully bumped app version to: ${manifest.version}`))
    } catch (error) {
      this.error(chalk.red(error))
    }
  }
}
