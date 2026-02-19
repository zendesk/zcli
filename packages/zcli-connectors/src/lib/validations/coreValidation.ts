import { existsSync } from 'fs'
import { join } from 'path'
import * as chalk from 'chalk'
import type { ValidationContext } from './index'

const REQUIRED_FILES = {
  manifest: 'manifest.json',
  connector: 'connector.js'
}

export function validateCore (context: ValidationContext): void {
  const { inputPath, options, log } = context

  if (options.verbose) {
    log(chalk.cyan('  → Running core structure validation...'))
  }

  try {
    const missingFiles: string[] = []

    const manifestPath = join(inputPath, REQUIRED_FILES.manifest)
    if (!existsSync(manifestPath)) {
      missingFiles.push(REQUIRED_FILES.manifest)
    }

    const connectorPath = join(inputPath, REQUIRED_FILES.connector)
    if (!existsSync(connectorPath)) {
      missingFiles.push(REQUIRED_FILES.connector)
    }

    if (missingFiles.length > 0) {
      const fileList = missingFiles.join(', ')
      throw new Error(
        `Missing required files: ${fileList}. Please re-run the bundle command to generate these files.`
      )
    }

    if (options.verbose) {
      log(chalk.cyan('  ✓ Required files found'))
      log(chalk.cyan('  ✓ Directory structure is valid'))
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    throw new Error(`Core validation failed: ${errorMessage}`)
  }
}
