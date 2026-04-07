import { Command, Flags } from '@oclif/core'
import * as chalk from 'chalk'
import * as semver from 'semver'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { join, resolve } from 'path'

export default class Bump extends Command {
  static description = 'bumps the version of your connector'

  static args = [
    { name: 'path', description: 'path to connector directory (defaults to current directory)', default: '.' }
  ]

  static examples = [
    '<%= config.bin %> <%= command.id %>',
    '<%= config.bin %> <%= command.id %> ./my-connector',
    '<%= config.bin %> <%= command.id %> -M ./my-connector',
    '<%= config.bin %> <%= command.id %> -m ./my-connector',
    '<%= config.bin %> <%= command.id %> -p ./my-connector'
  ]

  static flags = {
    help: Flags.help({ char: 'h' }),
    major: Flags.boolean({ char: 'M', description: 'increments the major version by 1' }),
    minor: Flags.boolean({ char: 'm', description: 'increments the minor version by 1' }),
    patch: Flags.boolean({ char: 'p', description: 'increments the patch version by 1' })
  }

  async run (): Promise<void> {
    const { args, flags } = await this.parse(Bump)
    const { major, minor } = flags
    const connectorPath = resolve(args.path || '.')

    // Validate connector directory exists
    if (!existsSync(connectorPath)) {
      this.error(chalk.red(`Error: Directory ${connectorPath} does not exist`))
    }

    const indexTsPath = join(connectorPath, 'src/index.ts')

    // Validate index.ts exists
    if (!existsSync(indexTsPath)) {
      this.error(chalk.red(`Error: Could not find src/index.ts in ${connectorPath}`))
    }

    try {
      let content = readFileSync(indexTsPath, 'utf8')

      // Extract current version using regex
      const versionRegex = /version:\s*['"]([^'"]+)['"]/
      const match = content.match(versionRegex)

      if (!match) {
        throw new Error('Could not find version field in src/index.ts. Make sure your connector manifest includes a version field.')
      }

      const currentVersion = match[1]

      // Validate current version is valid semver
      if (!semver.valid(currentVersion)) {
        throw new Error(`Current version '${currentVersion}' is not a valid semantic version`)
      }

      // Calculate new version
      let newVersion: string | null
      if (major) {
        newVersion = semver.inc(currentVersion, 'major')
      } else if (minor) {
        newVersion = semver.inc(currentVersion, 'minor')
      } else {
        newVersion = semver.inc(currentVersion, 'patch')
      }

      if (!newVersion) {
        throw new Error('Failed to increment version')
      }

      // Replace version in content while preserving original formatting and quotes
      const originalContent = content
      const fullMatch = match[0]
      const updatedMatch = fullMatch.replace(currentVersion, newVersion)
      content = content.replace(fullMatch, updatedMatch)

      // Verify that the content was actually changed
      if (content === originalContent) {
        throw new Error('Failed to update version in src/index.ts')
      }

      // Write updated content back to file
      writeFileSync(indexTsPath, content, 'utf8')

      this.log(chalk.green(`✅ Successfully bumped connector version from ${currentVersion} to ${newVersion}`))
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      const formattedMessage = errorMessage.trim().startsWith('Error:') ? errorMessage : `Error: ${errorMessage}`
      this.error(chalk.red(formattedMessage))
    }
  }
}
