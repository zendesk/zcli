import type { Setting, Variable, Flags } from '../types'
import * as fs from 'fs'
import * as path from 'path'
import { CLIError } from '@oclif/core/lib/errors'

export default function getVariables (themePath: string, settings: Setting[], flags: Flags): Variable[] {
  const settingsPath = `${themePath}/settings`
  const filenames = fs.existsSync(settingsPath) ? fs.readdirSync(settingsPath) : []
  const { bind: host, port } = flags

  return settings
    .reduce((variables: Variable[], setting) => [...variables, ...setting.variables], [])
    .map((variable: Variable) => {
      if (variable.type === 'file') {
        const file = filenames.find(filename => path.parse(filename).name === variable.identifier)
        if (!file) {
          throw new CLIError(
            `The setting "${variable.identifier}" of type "file" does not have a matching file within the "settings" folder`
          )
        }
        variable.value = file && `http://${host}:${port}/guide/settings/${file}`
      }
      return variable
    })
}
