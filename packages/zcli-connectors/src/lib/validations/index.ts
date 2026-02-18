import * as chalk from 'chalk'
import { validateCore } from './coreValidation'
import { validateManifest } from './manifestValidation'
import { validateAssets } from './assetsValidation'

export interface ValidationOptions {
  verbose: boolean
}

export interface ValidationContext {
  inputPath: string
  options: ValidationOptions
  log: (message: string) => void
}

export async function runValidationChecks (
  inputPath: string,
  options: ValidationOptions,
  log: (message: string) => void
): Promise<boolean> {
  const context: ValidationContext = {
    inputPath,
    options,
    log
  }

  validateCore(context)
  validateAssets(context)
  validateManifest(context)

  if (options.verbose) {
    log(chalk.cyan('  ✓ All validation checks completed'))
  }

  return true
}
