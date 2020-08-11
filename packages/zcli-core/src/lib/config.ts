import * as os from 'os'
import * as fs from 'fs-extra'
import * as path from 'path'

const HOME_DIR = os.homedir()
export const CONFIG_PATH = path.join(HOME_DIR, '.zcli')

export default class Config {
  async ensureConfigFile () {
    if (!await fs.pathExists(CONFIG_PATH)) {
      await fs.outputJson(CONFIG_PATH, {})
    }
  }

  async getConfig (key: string) {
    await this.ensureConfigFile()
    const config = await fs.readJson(CONFIG_PATH) || {}
    return config[key]
  }

  async setConfig (key: string, value: string | object) {
    await this.ensureConfigFile()
    const config = await fs.readJson(CONFIG_PATH) || {}
    config[key] = value
    await fs.outputJson(CONFIG_PATH, config)
  }

  async removeConfig (key: string) {
    await this.ensureConfigFile()
    const config = await fs.readJson(CONFIG_PATH) || {}
    delete config[key]
    await fs.outputJson(CONFIG_PATH, config)
  }
}
