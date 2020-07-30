import { expect, test } from '@oclif/test'
import { getManifestFile, updateManifestFile } from './manifest'
import * as path from 'path'
import * as fs from 'fs'

describe('getManifestFile', () => {
  let spyFilePath: string
  const manifestFilePath = path.join('appPath1', 'manifest.json')
  test
    .stub(fs, 'existsSync', () => true)
    .stub(fs, 'readFileSync', (...args) => {
      spyFilePath = (args as string[])[0]
      return JSON.stringify({ name: 'xman' })
    })
    .it('should return a JSON object with manifest.json file contents', () => {
      expect(getManifestFile('./appPath1')).to.deep.equal({ name: 'xman' })
      expect(spyFilePath).to.equal(manifestFilePath)
    })
})

describe('updateManifestFile', () => {
  let spyFilePath: string
  let spyFileContent: string
  const manifestFilePath = path.join('appPath1', 'manifest.json')
  const manifestContent = {
    author: {
      name: 'name',
      email: 'test@email.com'
    },
    defaultLocale: 'en',
    location: {},
    frameworkVersion: '2.0'
  }
  test
    .stub(fs, 'existsSync', () => true)
    .stub(fs, 'writeFileSync', (...args) => {
      spyFilePath = (args as string[])[0]
      spyFileContent = (args as string[])[1]
    })
    .it('should write a JSON object into manifest.json file contents', () => {
      updateManifestFile('./appPath1', manifestContent)
      expect(spyFilePath).to.equal(manifestFilePath)
      expect(spyFileContent).to.equal(JSON.stringify(manifestContent, null, 2))
    })
})
