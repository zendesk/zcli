import Plugins from '@oclif/plugin-plugins/lib/plugins'
import * as path from 'path'
import { homedir } from 'os'

// eslint-disable-next-line @typescript-eslint/no-var-requires
const packageJson = require('../../package.json')

export default class SecureStore {
  serviceName = 'zcli'
  pluginsPath = path.join(homedir(), '/.local/share/zcli')
  packageName = 'keytar'
  keytarPath = path.join(this.pluginsPath, 'node_modules', this.packageName)
  keytar = undefined

  help_env_vars=`
  You can use credentials stored in environment variables:

  # OPTION 1 (recommended)
  ZENDESK_SUBDOMAIN = your account subdomain
  ZENDESK_EMAIL = your account email
  ZENDESK_API_TOKEN = your account api token see https://{subdomain}.zendesk.com/agent/admin/api/settings

  # OPTION 2
  ZENDESK_SUBDOMAIN = your account subdomain
  ZENDESK_EMAIL = your account email
  ZENDESK_PASSWORD = your account password

  Once these environment variables are set, zcli profile is not required for authentication and will be ignored.
  `

  private async installKeytar () {
    const packageTag = `${this.packageName}@${packageJson.optionalDependencies.keytar}`
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const plugins = new (Plugins as any)({ dataDir: this.pluginsPath, cacheDir: this.pluginsPath })

    try {
      await plugins.createPJSON()
      await plugins.yarn.exec(['add', '--force', packageTag], { cwd: this.pluginsPath, verbose: false })
    } catch (error) {
      // TODO: add telemetry so we know when this fails
    }
  }

  async loadKeytar () {
    try {
      this.keytar = require(this.keytarPath)
    } catch (error) {
      await this.installKeytar()

      try {
        this.keytar = require(this.keytarPath)
      } catch (error) {
        // TODO: add telemetry so we know when this fails
      }
    }

    return this.keytar
  }

  setPassword (account: string, password: string) {
    return this.keytar.setPassword(this.serviceName, account, password)
  }

  getPassword (account: string) {
    return this.keytar.getPassword(this.serviceName, account)
  }

  deletePassword (account: string) {
    return this.keytar.deletePassword(this.serviceName, account)
  }

  getAllCredentials () {
    return this.keytar.findCredentials(this.serviceName)
  }
}
