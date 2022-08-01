import { Manifest } from '../types'
import { validatePath } from './fileUtils'
import * as path from 'path'
import * as fs from 'fs'
import * as chalk from 'chalk'
import { CLIError } from '@oclif/core/lib/errors'

export const getManifestFile = (appPath: string): Manifest => {
  const manifestFilePath = path.join(appPath, 'manifest.json')
  validatePath(manifestFilePath)

  const manifest = fs.readFileSync(manifestFilePath, 'utf8')
  return JSON.parse(manifest)
}

export const updateManifestFile = (appPath: string, manifestContent: Manifest): void => {
  const manifestFilePath = path.join(appPath, 'manifest.json')
  validatePath(manifestFilePath)
  try {
    fs.writeFileSync(manifestFilePath, JSON.stringify(manifestContent, null, 2))
  } catch (error) {
    throw new CLIError(chalk.red(`Failed to update Manifest file at path: ${manifestFilePath}. ${error}`))
  }
}
