import { Command } from '@oclif/core'
import * as chalk from 'chalk'
import { CLIError } from '@oclif/core/lib/errors'
import { SecureStore } from '@zendesk/zcli-core'
import { HELP_ENV_VARS } from '../../utils/helpMessage'

export default class Remove extends Command {
  static description = 'removes a profile'

  static args = [
    { name: 'account', required: true }
  ]

  static examples = [
    '$ zcli profiles:remove [ACCOUNT]'
  ]

  async run () {
    const { args } = await this.parse(Remove)
    const { account } = args

    const secureStore = new SecureStore()
    const keytar = await secureStore.loadKeytar()
    if (!keytar) {
      console.log(chalk.yellow('Failed to load secure credentials store: could not remove profile.'), HELP_ENV_VARS)
      return
    }

    const deleted = await secureStore.deleteSecret(account)
    if (!deleted) throw new CLIError(chalk.red(`Profile ${account} not found.`))
    console.log(chalk.green(`Removed ${account} profile.`))
  }
}
