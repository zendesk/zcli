import { CLIError } from '@oclif/core/lib/errors'
import * as fs from 'fs'
import * as chalk from 'chalk'

export default function rewriteJsAndCss (
  themePath: string,
  { css, js }: { css: string; js: string }
) {
  const cssPath = `${themePath}/style.css`
  const jsPath = `${themePath}/script.js`

  try {
    fs.writeFileSync(cssPath, css)
  } catch (error) {
    throw new CLIError(chalk.red(`Failed to write file: ${cssPath}`))
  }

  try {
    fs.writeFileSync(jsPath, js)
  } catch (error) {
    throw new CLIError(chalk.red(`Failed to write file: ${jsPath}`))
  }
}
