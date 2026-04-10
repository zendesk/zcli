import { CLIError } from '@oclif/core/lib/errors'
import * as fs from 'fs'
import * as chalk from 'chalk'

export default function rewriteTemplates (themePath: string, templates: Record<string, string>) {
  for (const [identifier, content] of Object.entries(templates)) {
    const filePath = `${themePath}/templates/${identifier}.hbs`

    if (typeof content === 'string') {
      try {
        fs.writeFileSync(filePath, content)
      } catch (error) {
        throw new CLIError(chalk.red(`Failed to write template file: ${filePath}`))
      }
    }
  }
}
