import { Command } from '@oclif/core'
import * as path from 'path'
import migrate from '../../lib/migrate'

export default class Migrate extends Command {
  static description = 'migrate theme to the latest version of the templating api'

  static hidden = true

  static args = [
    { name: 'themeDirectory', required: true, default: '.' }
  ]

  static examples = [
    '$ zcli themes:migrate ./copenhagen_theme'
  ]

  static strict = false

  async run () {
    const { flags, argv: [themeDirectory] } = await this.parse(Migrate)
    const themePath = path.resolve(themeDirectory)

    await migrate(themePath, flags)
  }
}
