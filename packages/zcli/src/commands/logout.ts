import { Command, Flags } from '@oclif/core'
import * as chalk from 'chalk'
import { SecureStore, Auth } from '@zendesk/zcli-core'

export default class Logout extends Command {
  static description = 'removes an authentication token for an active profile'

  static flags = {
    help: Flags.help({ char: 'h' }),
    subdomain: Flags.string({ char: 's', default: '', description: 'Zendesk Subdomain' })
  }

  static examples = [
    '$ zcli logout'
  ]

  async run () {
    const secureStore = new SecureStore()
    const keytar = await secureStore.loadKeytar()
    if (!keytar) {
      console.log(chalk.yellow('Secure credentials store not found.'))
      return
    }

    const auth = new Auth({ secureStore })
    const success = await auth.logout()

    if (success) {
      console.log(chalk.green('Successfully logged out.'))
    }
  }
}
