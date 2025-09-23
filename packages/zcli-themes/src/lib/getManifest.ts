import type { Manifest } from '../types'
import { CLIError } from '@oclif/core/lib/errors'
import * as fs from 'fs'
import * as chalk from 'chalk'

export default function getManifest (themePath: string): Manifest {
  const manifestFilePath = `${themePath}/manifest.json`

  if (fs.existsSync(manifestFilePath)) {
    const manifestFile = fs.readFileSync(manifestFilePath, 'utf8')
    try {
      return JSON.parse(manifestFile)
    } catch (_error) {
      throw new CLIError(chalk.red(`manifest.json file was malformed at path: "${manifestFilePath}"`))
    }
  } else {
    throw new CLIError(chalk.red(`Couldn't find a manifest.json file at path: "${manifestFilePath}"`))
  }
}
