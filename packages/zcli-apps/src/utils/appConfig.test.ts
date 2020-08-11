import * as appConfig from './appConfig'
import { expect, test } from '@oclif/test'
import * as fs from 'fs-extra'
import * as chalk from 'chalk'
import * as path from 'path'

describe('getAllConfigs', () => {
  let spyFilePath: string
  const appPath = './appPath1'
  const configFilePath = path.join('appPath1', 'zcli.apps.config.json')

  test
    .stub(fs, 'existsSync', () => true)
    .stub(fs, 'readFileSync', (...args) => {
      spyFilePath = (args as string[])[0]
      return JSON.stringify({ plan: 'silver' })
    })
    .it('should return a JSON object with zcli.apps.config.json file contents', () => {
      expect(appConfig.getAllConfigs(appPath, 'zcli.apps.config.json')).to.deep.equal({ plan: 'silver' })
      expect(spyFilePath).to.equal(configFilePath)
    })

  test
    .stub(fs, 'existsSync', () => false)
    .it('should return undefined', () => {
      expect(appConfig.getAllConfigs(appPath, 'zcli.apps.config.json')).to.be.an('undefined')
    })

  test
    .stub(fs, 'existsSync', () => true)
    .stub(fs, 'readFileSync', () => {
      Error('bad json')
    })
    .it('should return undefined and trigger a CLIError', () => {
      expect(() => {
        appConfig.getAllConfigs(appPath, 'zcli.apps.config.json')
      }).to.throw(chalk.red(`zcli configuration file was malformed at path: ${configFilePath}`))
    })
})

describe('setConfig', () => {
  let spyFileJson: string
  const appPath = 'appPath1'
  const configFileJson = { plan: 'silver', table: 'tennis' }

  test
    .stub(path, 'resolve', (...args) => {
      return (args as string[])[0]
    })
    .stub(fs, 'pathExists', () => true)
    .stub(fs, 'readJson', () => {
      return { plan: 'silver' }
    })
    .stub(fs, 'outputJson', (...args) => {
      spyFileJson = (args as string[])[1]
    })
    .it('should store key to zcli.apps.config.json file contents', async () => {
      await appConfig.setConfig('table', 'tennis', appPath)
      expect(spyFileJson).to.deep.equal(configFileJson)
    })
})
