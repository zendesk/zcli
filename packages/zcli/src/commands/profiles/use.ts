import { Command } from '@oclif/core'
import * as chalk from 'chalk'
import { SecureStore, Auth } from '@zendesk/zcli-core'
import { HELP_ENV_VARS } from '../../utils/helpMessage'

export default class Remove extends Command {
  static description = 'switches to a profile'

  static args = [
    { name: 'subdomain', required: true }
  ]

  static examples = [
    '$ zcli profiles:use [SUBDOMAIN]'
  ]

  async run () {
    const { args } = await this.parse(Remove)
    const { subdomain } = args

    const secureStore = new SecureStore()
    const keytar = await secureStore.loadKeytar()
    if (!keytar) {
      console.log(chalk.yellow(`Failed to load secure credentials store: could not switch to ${subdomain} profile.`), HELP_ENV_VARS)
      return
    }

    const auth = new Auth({ secureStore })
    const profiles = await auth.getSavedProfiles()

    if (profiles && profiles.length) {
      const profileExists = !!profiles.filter(({ account }) => account === subdomain)?.length
      if (profileExists) {
        await auth.setLoggedInProfile(subdomain)
        console.log(chalk.green(`Switched to ${subdomain} profile.`))
      } else {
        console.log(chalk.red(`Failed to find ${subdomain} profile.`))
      }
    } else {
      console.log(chalk.red(`Failed to find ${subdomain} profile.`))
    }
  }
}
