import Plugins from '@oclif/plugin-plugins/lib/plugins'
import * as path from 'path'
import { homedir } from 'os'
import { KeyTar } from '../types'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const packageJson = require('../../package.json')

export default class SecureStore {
  serviceName = 'zcli'
  pluginsPath = path.join(homedir(), '/.local/share/zcli')
  packageName = 'keytar'
  keytarPath = path.join(this.pluginsPath, 'node_modules', this.packageName)
  keytar: KeyTar | undefined = undefined

  private async installKeytar () {
    const packageTag = `${this.packageName}@${packageJson.optionalDependencies.keytar}`
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const plugins = new (Plugins as any)({ dataDir: this.pluginsPath, cacheDir: this.pluginsPath })

    try {
      await plugins.createPJSON()
      await plugins.yarn.exec(['add', '--force', packageTag], { cwd: this.pluginsPath, verbose: false })
    } catch (_error) {
      // TODO: add telemetry so we know when this fails
    }
  }

  async loadKeytar () {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      this.keytar = require(this.keytarPath) as KeyTar
    } catch (_error) {
      await this.installKeytar()

      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        this.keytar = require(this.keytarPath) as KeyTar
      } catch (_error) {
        // TODO: add telemetry so we know when this fails
      }
    }

    return this.keytar
  }

  setSecret (account: string, secret: string) {
    return this.keytar?.setPassword(this.serviceName, account, secret)
  }

  getSecret (account: string) {
    return this.keytar?.getPassword(this.serviceName, account)
  }

  deleteSecret (account: string) {
    return this.keytar?.deletePassword(this.serviceName, account)
  }

  getAllCredentials () {
    return this.keytar?.findCredentials(this.serviceName)
  }
}
