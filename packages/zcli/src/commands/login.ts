import { Command, Flags } from '@oclif/core'
import * as chalk from 'chalk'
import { SecureStore, Auth, getAccount } from '@zendesk/zcli-core'
import { HELP_ENV_VARS } from '../utils/helpMessage'

export default class Login extends Command {
  static description = 'creates and/or saves authentication credentials for the specified subdomain'

  static flags = {
    help: Flags.help({ char: 'h' }),
    subdomain: Flags.string({ char: 's', default: '', description: 'Zendesk Subdomain' }),
    domain: Flags.string({ char: 'd', description: 'Zendesk domain' })
  }

  static examples = [
    '$ zcli login',
    '$ zcli login -s zendesk-subdomain',
    '$ zcli login -s zendesk-subdomain -d example.com'
  ]

  async run () {
    const { flags } = await this.parse(Login)
    const { subdomain, domain } = flags

    const secureStore = new SecureStore()
    const keytar = await secureStore.loadKeytar()
    if (!keytar) {
      console.log(chalk.red('OAuth login requires keytar, which failed to install. Install it manually to use `zcli login`. For CI/CD, use environment-based authentication instead.'), HELP_ENV_VARS)
      this.exit(1)
    }

    const auth = new Auth({ secureStore })
    try {
      const success = await auth.loginWithOAuth({ subdomain, domain })
      if (success) {
        console.log(chalk.green('Successfully logged in.'))
      } else {
        const account = getAccount(subdomain, domain)
        console.log(chalk.red(`Failed to log in to your account: ${account}.`))
        this.exit(1)
      }
    } catch (error) {
      console.log(chalk.red((error as Error).message))
      this.exit(1)
    }
  }
}
