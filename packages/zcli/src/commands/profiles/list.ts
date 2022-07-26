import { Command, CliUx } from '@oclif/core'
import * as chalk from 'chalk'
import { Auth, SecureStore } from '@zendesk/zcli-core'
import { Credential, Profile } from '@zendesk/zcli-core/src/types'
import { HELP_ENV_VARS } from '../../utils/helpMessage'

export default class List extends Command {
  static description = 'lists all the profiles'

  static examples = [
    '$ zcli profiles'
  ]

  renderProfiles (profiles: Credential[], loggedInProfile: Profile | undefined) {
    CliUx.ux.table(profiles, {
      account: {
        header: 'Subdomains',
        get: row => {
          let log = row.account
          if (row.account === loggedInProfile?.subdomain) {
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
      console.log(chalk.yellow('Failed to load secure credentials store: could not load profiles.'), HELP_ENV_VARS)
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
