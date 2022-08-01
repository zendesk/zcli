import * as rimraf from 'rimraf'
import * as utils from 'util'
import * as fs from 'fs'
import * as chalk from 'chalk'
import { CLIError } from '@oclif/core/lib/errors'

const removeDirectory = utils.promisify(rimraf)

export const cleanDirectory = async (directory: string) => {
  await removeDirectory(directory)
  return true
}

export const validatePath = (path: string) => {
  if (!fs.existsSync(path)) {
    throw new CLIError(chalk.red(`Invalid path: ${path}`))
  }
}
