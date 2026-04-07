import { Command, Flags, CliUx } from '@oclif/core'
import * as chalk from 'chalk'
import * as ora from 'ora'
import { request } from '@zendesk/zcli-core'

export default class Delete extends Command {
  static description = 'delete a private connector from your account'

  static examples = [
    '<%= config.bin %> <%= command.id %> my-connector',
    '<%= config.bin %> <%= command.id %>',
    '<%= config.bin %> <%= command.id %> my-connector --force'
  ]

  static flags = {
    help: Flags.help({ char: 'h' }),
    verbose: Flags.boolean({
      char: 'v',
      description: 'verbose output',
      default: false
    }),
    force: Flags.boolean({
      char: 'f',
      description: 'skip confirmation prompt',
      default: false
    })
  }

  static args = [
    {
      name: 'connector',
      description: 'name of the connector to delete',
      required: false
    }
  ]

  async run (): Promise<void> {
    const { args, flags } = await this.parse(Delete)

    let connectorName = args.connector
    if (!connectorName) {
      connectorName = await CliUx.ux.prompt('Connector name')
    }

    connectorName = connectorName.trim()

    if (!connectorName) {
      this.error('Connector name cannot be empty', { exit: 1 })
    }

    if (flags.verbose) {
      this.logVerbose('Verbose mode enabled')
      this.logVerbose(`Connector name: ${connectorName}`)
    }

    // Confirmation prompt (skip if --force)
    if (!flags.force) {
      const confirmation = (await CliUx.ux.prompt(
        `Are you sure you want to delete connector '${connectorName}'? Type the connector name to confirm`
      )).trim()

      if (confirmation !== connectorName) {
        this.log(chalk.yellow('Deletion cancelled'))
        return
      }
    }

    const spinner = ora('Deleting connector...').start()

    try {
      const response = await request.requestAPI(
        `/flowstate/connectors/private/${encodeURIComponent(connectorName)}`,
        { method: 'DELETE' }
      )

      spinner?.stop()

      if (flags.verbose) {
        this.logVerbose(`API response status: ${response.status}`)
        if (response.data) {
          this.logVerbose(`Response data: ${JSON.stringify(response.data, null, 2)}`)
        }
      }

      // Handle success
      if (response.status === 200 || response.status === 204) {
        this.log(chalk.green(`✓ Connector '${connectorName}' deleted successfully`))
      } else {
        // Non-2xx response - construct error message
        const serializedResponseData = JSON.stringify(response.data)
        const errorDetails =
          response.data?.message ||
          response.data?.error ||
          serializedResponseData ||
          'No additional error details provided'
        throw new Error(`Failed to delete connector: HTTP ${response.status} - ${errorDetails}`)
      }
    } catch (error) {
      spinner?.fail(chalk.red('Failed to delete connector'))

      let errorMessage = (error instanceof Error) ? error.message : String(error)

      // Provide helpful error messages for common cases
      if (errorMessage.includes('404')) {
        errorMessage = `Connector '${connectorName}' not found. Use 'zcli connectors:list' to see available connectors.`
      } else if (errorMessage.includes('403')) {
        errorMessage = 'Permission denied. You don\'t have access to delete this connector.'
      }

      if (flags.verbose) {
        this.logVerbose('\nError Details:', 'red')
        this.logVerbose(errorMessage, 'red')
      }

      this.error(errorMessage, { exit: 1 })
    }
  }

  private logVerbose (message: string, color?: 'cyan' | 'red'): void {
    const coloredMessage = color ? chalk[color](message) : chalk.cyan(message)
    this.log(coloredMessage)
  }
}
