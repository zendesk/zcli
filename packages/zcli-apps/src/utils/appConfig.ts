import { ZcliConfigFileContent } from '../types'

import * as path from 'path'
import * as fs from 'fs-extra'
import * as chalk from 'chalk'
import { CLIError } from '@oclif/errors'
import { DEFAULT_APPS_CONFIG_FILE } from '../constants'

export const getAllConfigs = (appPath: string, configFileName: string = DEFAULT_APPS_CONFIG_FILE): ZcliConfigFileContent | undefined => {
  const configFilePath = path.join(appPath, configFileName)

  if (fs.existsSync(configFilePath)) {
    const zcliConfigFile = fs.readFileSync(configFilePath, 'utf8')
    try {
      return JSON.parse(zcliConfigFile)
    } catch (error) {
      throw new CLIError(chalk.red(`zcli configuration file was malformed at path: ${configFilePath}`))
    }
  }
}

export const setConfig = async (key: string, value: string, appPath: string): Promise<void> => {
  const configPath = `${path.resolve(appPath)}/zcli.apps.config.json`
  if (!await fs.pathExists(configPath)) {
    await fs.outputJson(configPath, { [key]: value })
  } else {
    const config = await fs.readJson(configPath) || {}
    config[key] = value
    await fs.outputJson(configPath, config)
  }
}
