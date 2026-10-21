import { Command, Flags } from '@oclif/core'
import * as chalk from 'chalk'
import { resolve } from 'path'
import { downloadEncryptionKey } from '../../lib/encryption-key/download'
import { displayEarlyAccessWarning } from '../../utils/display'

export default class EncryptionKey extends Command {
  static description = 'download the public connector encryption key (Early Access - Limited Availability)'

  static examples = [
    '<%= config.bin %> <%= command.id %> --output public-key.pem'
  ]

  static flags = {
    help: Flags.help({ char: 'h' }),
    output: Flags.string({
      char: 'o',
      description: 'destination file for the downloaded PEM public key',
      required: true
    }),
    verbose: Flags.boolean({
      char: 'v',
      description: 'verbose output',
      default: false
    })
  }

  async run (): Promise<void> {
    const { flags } = await this.parse(EncryptionKey)

    displayEarlyAccessWarning(this.log.bind(this))

    const destination = resolve(flags.output)

    if (flags.verbose) {
      this.logVerbose('Verbose mode enabled')
      this.logVerbose(`Destination: ${destination}`)
      this.logVerbose('Requesting the public connector encryption key from Flowstate...')
    }

    try {
      await downloadEncryptionKey(destination)

      if (flags.verbose) {
        this.logVerbose(`Public key written to ${destination}`)
      }

      this.log(chalk.green(`Public connector encryption key written to ${destination}`))
    } catch (error) {
      // Never log the raw error object: it may carry authenticated request
      // configuration. Helpers already reduce failures to safe messages.
      const errorMessage = (error instanceof Error) ? error.message : String(error)
      this.error(chalk.red(errorMessage), { exit: 1 })
    }
  }

  private logVerbose (message: string, color?: 'cyan' | 'red'): void {
    const coloredMessage = color ? chalk[color](message) : chalk.cyan(message)
    this.log(coloredMessage)
  }
}
