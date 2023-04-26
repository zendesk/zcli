import type { Flags, RuntimeContext } from '../types'
import * as fs from 'fs'
import { CliUx } from '@oclif/core'
import { CLIError } from '@oclif/core/lib/errors'
import * as chalk from 'chalk'

export default async function getRuntimeContext (themePath: string, flags: Flags): Promise<RuntimeContext> {
  const configFilePath = `${themePath}/zcli.themes.config.json`
  let config = {
    subdomain: undefined,
    username: undefined,
    password: undefined
  }

  if (fs.existsSync(configFilePath)) {
    const zcliConfigFile = fs.readFileSync(configFilePath, 'utf8')
    try {
      config = JSON.parse(zcliConfigFile)
    } catch (error) {
      throw new CLIError(chalk.red(`zcli configuration file was malformed at path: "${configFilePath}"`))
    }
  }

  const subdomain = flags.subdomain || config.subdomain || await CliUx.ux.prompt('Account subdomain or full URL (including protocol)')
  const username = flags.username || config.username || await CliUx.ux.prompt('Account username (email)')
  const password = flags.password || config.password || await CliUx.ux.prompt('Account password', { type: 'hide' })

  let origin: string

  try {
    origin = new URL(subdomain).origin
  } catch {
    origin = `https://${subdomain}.zendesk.com`
  }

  return {
    ...flags,
    host: flags.bind,
    subdomain, // evaluate keeping around
    username,
    password,
    origin
  }
}
