import { Command, Flags } from '@oclif/core'
import * as chalk from 'chalk'
import { SecureStore, Auth } from '@zendesk/zcli-core'
import { HELP_ENV_VARS } from '../utils/helpMessage'

export default class Login extends Command {
  static description = 'creates and/or saves an authentication token for the specified subdomain'

  static flags = {
    help: Flags.help({ char: 'h' }),
    subdomain: Flags.string({ char: 's', default: '', description: 'Zendesk Subdomain' }),
    interactive: Flags.boolean({ char: 'i', default: false, description: 'Use Terminal based login' })
  }

  static examples = [
    '$ zcli login -i',
    '$ zcli login -s zendesk-subdomain -i'
  ]

  async run () {
    const secureStore = new SecureStore()
    const keytar = await secureStore.loadKeytar()
    if (!keytar) {
      console.log(chalk.yellow('Failed to load secure credentials store: use environment variables to log in.'), HELP_ENV_VARS)
      return
    }

    const { flags } = await this.parse(Login)
    const { interactive, subdomain } = flags

    if (interactive) {
      const auth = new Auth({ secureStore })
      const success = await auth.loginInteractively({ subdomain })
      if (success) {
        console.log(chalk.green('Successfully logged in.'))
      } else {
        console.log(chalk.red(`Failed to log in to your account: ${subdomain}.`))
      }
    } else {
      console.log('Browser login coming soon, use `zcli login -i` for interactive logins.')
    }
  }
}
