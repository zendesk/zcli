import Plugins from '@oclif/plugin-plugins/lib/plugins'
import * as path from 'path'
import { homedir } from 'os'
import { KeyTar } from '../types'

// eslint-disable-next-line @typescript-eslint/no-var-requires
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
    } catch (error) {
      // TODO: add telemetry so we know when this fails
    }
  }

  async loadKeytar () {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      this.keytar = require(this.keytarPath) as KeyTar
    } catch (error) {
      await this.installKeytar()

      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        this.keytar = require(this.keytarPath) as KeyTar
      } catch (error) {
        // TODO: add telemetry so we know when this fails
      }
    }

    return this.keytar
  }

  setPassword (account: string, password: string) {
    return this.keytar?.setPassword(this.serviceName, account, password)
  }

  getPassword (account: string) {
    return this.keytar?.getPassword(this.serviceName, account)
  }

  deletePassword (account: string) {
    return this.keytar?.deletePassword(this.serviceName, account)
  }

  getAllCredentials () {
    return this.keytar?.findCredentials(this.serviceName)
  }
}
