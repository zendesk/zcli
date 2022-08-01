import * as fs from 'fs'
import * as path from 'path'
import * as chalk from 'chalk'
import { CLIError } from '@oclif/core/lib/errors'

export const validateAppPath = (appPath: string) => {
  if (!fs.existsSync(path.join(appPath, 'manifest.json'))) {
    throw new CLIError(chalk.red(`Invalid app path: ${appPath}`))
  }
}
