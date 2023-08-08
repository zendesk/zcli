import { Command } from '@oclif/core'
import * as chalk from 'chalk'
import { SecureStore, Auth, getProfileFromAccount } from '@zendesk/zcli-core'
import { HELP_ENV_VARS } from '../../utils/helpMessage'

export default class Remove extends Command {
  static description = 'switches to a profile'

  static args = [
    { name: 'account', required: true }
  ]

  static examples = [
    '$ zcli profiles:use [ACCOUNT]'
  ]

  async run () {
    const { args } = await this.parse(Remove)
    const { account } = args

    const secureStore = new SecureStore()
    const keytar = await secureStore.loadKeytar()
    if (!keytar) {
      console.log(chalk.yellow(`Failed to load secure credentials store: could not switch to ${account} profile.`), HELP_ENV_VARS)
      return
    }

    const auth = new Auth({ secureStore })
    const profiles = await auth.getSavedProfiles()

    if (profiles && profiles.length) {
      const profileExists = !!profiles.filter((profile) => profile.account === account)?.length
      if (profileExists) {
        const { subdomain, domain } = getProfileFromAccount(account)
        await auth.setLoggedInProfile(subdomain, domain)
        console.log(chalk.green(`Switched to ${account} profile.`))
      } else {
        console.log(chalk.red(`Failed to find ${account} profile.`))
      }
    } else {
      console.log(chalk.red(`Failed to find ${account} profile.`))
    }
  }
}
