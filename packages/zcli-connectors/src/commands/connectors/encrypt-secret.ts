import { Command, Flags } from '@oclif/core'
import * as chalk from 'chalk'
import { promises as fs } from 'fs'
import { resolve } from 'path'
import { encryptClientSecret, readSecretFromStdin } from '../../lib/encryption-key/encrypt'
import { fetchEncryptionKey } from '../../lib/encryption-key/download'
import { displayEarlyAccessWarning } from '../../utils/display'

export default class EncryptSecret extends Command {
  static description = 'encrypt a publisher OAuth client secret for settings.json (Early Access - Limited Availability)'

  static examples = [
    'secret-manager-command | <%= config.bin %> <%= command.id %>',
    'secret-manager-command | <%= config.bin %> <%= command.id %> --key public-key.pem'
  ]

  static flags = {
    help: Flags.help({ char: 'h' }),
    key: Flags.string({
      char: 'k',
      description: 'path to a PEM public key downloaded with connectors:encryption-key (default: fetch the active key from Zendesk)',
      required: false
    }),
    verbose: Flags.boolean({
      char: 'v',
      description: 'verbose output',
      default: false
    })
  }

  async run (): Promise<void> {
    const { flags } = await this.parse(EncryptSecret)

    // The banner and verbose details go to stderr: stdout carries only the
    // encrypted value so the command pipes cleanly into files and clipboards.
    displayEarlyAccessWarning(this.logToStderr.bind(this))

    try {
      let publicKeyPem: string
      if (flags.key) {
        const keyPath = resolve(flags.key)
        if (flags.verbose) {
          this.logVerbose(`Reading the public key from ${keyPath}`)
        }
        publicKeyPem = await fs.readFile(keyPath, 'utf-8')
      } else {
        if (flags.verbose) {
          this.logVerbose('Requesting the active public connector encryption key from Zendesk...')
        }
        publicKeyPem = await fetchEncryptionKey()
      }

      if (flags.verbose) {
        this.logVerbose('Reading the client secret from stdin...')
      }

      const secret = await readSecretFromStdin(process.stdin)
      let envelope: string
      try {
        envelope = await encryptClientSecret(secret, publicKeyPem)
      } finally {
        secret.fill(0)
      }

      this.log(envelope)
    } catch (error) {
      // Never log the raw error object: it may carry authenticated request
      // configuration. Helpers already reduce failures to safe messages.
      const errorMessage = (error instanceof Error) ? error.message : String(error)
      this.error(chalk.red(errorMessage), { exit: 1 })
    }
  }

  private logVerbose (message: string): void {
    this.logToStderr(chalk.cyan(message))
  }
}
