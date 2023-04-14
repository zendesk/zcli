import type { Setting, Variable, RuntimeContext } from '../types'
import * as fs from 'fs'
import * as path from 'path'
import { CLIError } from '@oclif/core/lib/errors'

export default function getVariables (themePath: string, settings: Setting[], context: RuntimeContext): Variable[] {
  const settingsPath = `${themePath}/settings`
  const filenames = fs.existsSync(settingsPath) ? fs.readdirSync(settingsPath) : []

  return settings
    .reduce((variables: Variable[], setting) => [...variables, ...setting.variables], [])
    .map((variable: Variable) => {
      if (variable.type === 'file') {
        const file = filenames.find(filename => path.parse(filename).name === variable.identifier)
        if (!file) {
          throw new CLIError(
            `The setting "${variable.identifier}" of type "file" does not a matching file within the "settings" folder`
          )
        }
        variable.value = file && `http://${context.host}:${context.port}/guide/settings/${file}`
      }
      return variable
    })
}
