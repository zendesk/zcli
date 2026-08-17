import { Command, Flags } from '@oclif/core'
import * as chalk from 'chalk'
import { SecureStore, Auth, getAccount } from '@zendesk/zcli-core'
import { HELP_ENV_VARS } from '../utils/helpMessage'

export default class Login extends Command {
  static description = 'creates and/or saves authentication credentials for the specified subdomain'

  static flags = {
    help: Flags.help({ char: 'h' }),
    subdomain: Flags.string({ char: 's', default: '', description: 'Zendesk Subdomain' }),
    domain: Flags.string({ char: 'd', description: 'Zendesk domain' }),
    interactive: Flags.boolean({ char: 'i', default: false, description: 'Use Terminal based login (deprecated)' })
  }

  static examples = [
    '$ zcli login',
    '$ zcli login -s zendesk-subdomain',
    '$ zcli login -s zendesk-subdomain -d example.com'
  ]

  async run () {
    const { flags } = await this.parse(Login)
    const { interactive, subdomain, domain } = flags

    const secureStore = new SecureStore()
    const keytar = await secureStore.loadKeytar()
    if (!keytar) {
      if (interactive) {
        console.log(chalk.yellow('Failed to load secure credentials store: use environment variables to log in.'), HELP_ENV_VARS)
      } else {
        console.log(chalk.red('OAuth login requires keytar, which failed to install. Please install it manually.'))
      }
      return
    }

    const auth = new Auth({ secureStore })

    if (interactive) {
      console.log(chalk.yellow('`zcli login -i` is deprecated. Run `zcli login` (no flags) to use browser-based OAuth login instead.'))
      const success = await auth.loginInteractively({ subdomain, domain })
      if (success) {
        console.log(chalk.green('Successfully logged in.'))
      } else {
        const account = getAccount(subdomain, domain)
        console.log(chalk.red(`Failed to log in to your account: ${account}.`))
      }
    } else {
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
}
