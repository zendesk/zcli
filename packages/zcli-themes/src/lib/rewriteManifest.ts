import { CLIError } from '@oclif/core/lib/errors'
import * as fs from 'fs'
import * as chalk from 'chalk'

export default function rewriteManifest (themePath: string, apiVersion: number) {
  const manifestFilePath = `${themePath}/manifest.json`

  try {
    const manifestFile = fs.readFileSync(manifestFilePath, 'utf8')

    // Rewrite with "replace" for minimal diff
    const updatedContent = manifestFile.replace(/"api_version"\s*:\s*\d+/, `"api_version": ${apiVersion}`)

    fs.writeFileSync(manifestFilePath, updatedContent)
  } catch (error) {
    throw new CLIError(chalk.red(`Failed to read or write manifest file: ${manifestFilePath}`))
  }
}
