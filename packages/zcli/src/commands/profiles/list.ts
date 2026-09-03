import { Command, CliUx } from '@oclif/core'
import * as chalk from 'chalk'
import { Auth, SecureStore, getAccount, decodeOAuthSecret } from '@zendesk/zcli-core'
import { Credential, Profile } from '@zendesk/zcli-core/src/types'
import { HELP_KEYTAR_REQUIRED } from '../../utils/helpMessage'

export default class List extends Command {
  static description = 'lists all the profiles'

  static examples = [
    '$ zcli profiles'
  ]

  renderProfiles (profiles: Credential[], loggedInProfile: Profile | undefined) {
    CliUx.ux.table(profiles, {
      account: {
        header: 'Accounts',
        get: row => {
          const authTag = decodeOAuthSecret(row.password) ? chalk.dim('[oauth]') : chalk.dim('[token, deprecated]')
          let log = `${row.account} ${authTag}`
          if (row.account === getAccount(loggedInProfile?.subdomain ?? '', loggedInProfile?.domain)) {
            log = `${log} ${chalk.bold.green('<= active')}`
          }
          return log
        }
      }
    }, {
      printLine: this.log.bind(this)
    })
  }

  async run () {
    const secureStore = new SecureStore()
    const keytar = await secureStore.loadKeytar()
    if (!keytar) {
      console.log(chalk.yellow('Failed to load secure credentials store: could not load profiles.'), HELP_KEYTAR_REQUIRED)
      return
    }

    const auth = new Auth({ secureStore })
    const profiles = await auth.getSavedProfiles()

    if (profiles && profiles.length) {
      const loggedInProfile = await auth.getLoggedInProfile()
      this.renderProfiles(profiles, loggedInProfile)
    } else {
      console.log('No profiles were found, use `zcli login` to create an active profile.')
    }
  }
}
