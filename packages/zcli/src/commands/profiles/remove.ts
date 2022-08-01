import { Command } from '@oclif/core'
import * as chalk from 'chalk'
import { CLIError } from '@oclif/core/lib/errors'
import { SecureStore } from '@zendesk/zcli-core'
import { HELP_ENV_VARS } from '../../utils/helpMessage'

export default class Remove extends Command {
  static description = 'removes a profile'

  static args = [
    { name: 'subdomain', required: true }
  ]

  static examples = [
    '$ zcli profiles:remove [SUBDOMAIN]'
  ]

  async run () {
    const { args } = await this.parse(Remove)
    const { subdomain } = args

    const secureStore = new SecureStore()
    const keytar = await secureStore.loadKeytar()
    if (!keytar) {
      console.log(chalk.yellow('Failed to load secure credentials store: could not remove profile.'), HELP_ENV_VARS)
      return
    }

    const deleted = await secureStore.deletePassword(subdomain)
    if (!deleted) throw new CLIError(chalk.red(`Profile ${subdomain} not found.`))
    console.log(chalk.green(`Removed ${subdomain} profile.`))
  }
}
