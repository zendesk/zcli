import { CLIError } from '@oclif/core/lib/errors'
import * as fs from 'fs'
import * as chalk from 'chalk'

export default function rewriteAssets (themePath: string, assets: Record<string, string>) {
  const assetsDir = `${themePath}/assets`

  try {
    fs.mkdirSync(assetsDir, { recursive: true })
  } catch (error) {
    throw new CLIError(chalk.red(`Failed to create assets directory: ${assetsDir}`))
  }

  for (const [filename, base64Content] of Object.entries(assets)) {
    const filePath = `${assetsDir}/${filename}`

    try {
      fs.writeFileSync(filePath, Buffer.from(base64Content, 'base64'))
    } catch (error) {
      throw new CLIError(chalk.red(`Failed to write asset file: ${filePath}`))
    }
  }
}
