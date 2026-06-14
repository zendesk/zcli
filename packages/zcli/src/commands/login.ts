import { Command, Flags, CliUx } from '@oclif/core'
import * as chalk from 'chalk'
import { SecureStore, Auth, getAccount } from '@zendesk/zcli-core'
import { HELP_ENV_VARS } from '../utils/helpMessage'

export default class Login extends Command {
  static description = 'logs in to a Zendesk subdomain via OAuth (default) or API token (-i)'

  static flags = {
    help: Flags.help({ char: 'h' }),
    subdomain: Flags.string({ char: 's', default: '', description: 'Zendesk Subdomain' }),
    domain: Flags.string({ char: 'd', description: 'Zendesk domain' }),
    interactive: Flags.boolean({ char: 'i', default: false, description: 'Use API-token (interactive) login' }),
    'client-id': Flags.string({ description: 'OAuth client identifier (registered in Zendesk Admin Center)' })
  }

  static examples = [
    '$ zcli login -s zendesk-subdomain --client-id <oauth-client-id>',
    '$ zcli login -i',
    '$ zcli login -s zendesk-subdomain -i',
    '$ zcli login -s zendesk-subdomain -d example.com -i'
  ]

  async run () {
    const secureStore = new SecureStore()
    const keytar = await secureStore.loadKeytar()
    if (!keytar) {
      this.log(chalk.yellow('Failed to load secure credentials store: use environment variables to log in.'), HELP_ENV_VARS)
      return
    }

    const { flags } = await this.parse(Login)
    const { interactive, subdomain, domain } = flags
    const auth = new Auth({ secureStore })

    if (interactive) {
      const success = await auth.loginInteractively({ subdomain, domain })
      if (success) {
        this.log(chalk.green('Successfully logged in.'))
      } else {
        const account = getAccount(subdomain, domain)
        this.log(chalk.red(`Failed to log in to your account: ${account}.`))
      }
      return
    }

    const resolvedSubdomain = subdomain || await CliUx.ux.prompt('Subdomain')
    const clientId = flags['client-id'] || await CliUx.ux.prompt('OAuth Client ID')
    if (!clientId) {
      this.log(chalk.red('OAuth Client ID is required. Register an OAuth client in Zendesk Admin Center → Apps and integrations → APIs → Zendesk API → OAuth Clients.'))
      return
    }

    const success = await auth.loginViaOAuth({
      subdomain: resolvedSubdomain,
      domain,
      clientId
    })
    if (success) {
      this.log(chalk.green('Successfully logged in.'))
    } else {
      const account = getAccount(resolvedSubdomain, domain)
      this.log(chalk.red(`Failed to log in to your account: ${account}.`))
    }
  }
}
