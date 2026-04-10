import { Command, Flags, CliUx } from '@oclif/core'
import * as chalk from 'chalk'
import * as ora from 'ora'
import { request } from '@zendesk/zcli-core'

interface ConnectorListItem {
  connector_name: string
  connector_nice_id: string | null
  title: string | null
  version: string
  description: string | null
  created_at: string
  updated_at: string
  [key: string]: string | null
}

interface ListConnectorsResponse {
  connectors?: ConnectorListItem[]
}

export default class List extends Command {
  static description = 'list private connectors for the current account'

  static examples = [
    '<%= config.bin %> <%= command.id %>'
  ]

  static flags = {
    help: Flags.help({ char: 'h' }),
    verbose: Flags.boolean({
      char: 'v',
      description: 'verbose output',
      default: false
    })
  }

  async run (): Promise<void> {
    const { flags } = await this.parse(List)

    if (flags.verbose) {
      this.logVerbose('Verbose mode enabled')
    }

    const spinner = (ora as any)('Fetching connectors...').start()

    try {
      const response = await request.requestAPI('/flowstate/connectors/private', {
        method: 'GET'
      })

      spinner?.stop()

      if (flags.verbose) {
        this.logVerbose(`API response status: ${response.status}`)
        this.logVerbose(`Response data: ${JSON.stringify(response.data, null, 2)}`)
      }

      const data = response.data as ListConnectorsResponse

      // Handle non-200 responses
      if (response.status !== 200) {
        const errorMsg = `API returned non-200 status: ${response.status}`
        const responseData = JSON.stringify(response.data, null, 2)

        this.log(chalk.red(errorMsg))
        this.log(chalk.yellow('Response data:'), responseData)
        return
      }

      if (!data.connectors || data.connectors.length === 0) {
        this.log(chalk.yellow('No connectors found'))
        return
      }

      this.displayTable(data.connectors)
    } catch (error) {
      spinner?.fail(chalk.red('Failed to fetch connectors'))

      const errorMessage = (error instanceof Error) ? error.message : String(error)

      if (flags.verbose) {
        this.logVerbose('\nError Details:', 'red')
        this.logVerbose(errorMessage)
      }

      this.error(errorMessage, { exit: 1 })
    }
  }

  private logVerbose (message: string, color?: 'cyan' | 'red'): void {
    const coloredMessage = color ? chalk[color](message) : chalk.cyan(message)
    this.log(coloredMessage)
  }

  private displayTable (connectors: ConnectorListItem[]): void {
    this.log(chalk.green(`\nFound ${connectors.length} connector(s):\n`))

    CliUx.ux.table(connectors, {
      title: {
        header: 'Title',
        minWidth: 30,
        get: (row: ConnectorListItem) => row.title || row.connector_name
      },
      connector_name: {
        header: 'Connector Name',
        minWidth: 25,
        get: (row: ConnectorListItem) => row.connector_nice_id || row.connector_name
      },
      version: {
        header: 'Version',
        minWidth: 10
      },
      description: {
        header: 'Description',
        minWidth: 35,
        get: (row: ConnectorListItem) => row.description || '-'
      },
      created_at: {
        header: 'Created',
        minWidth: 20,
        get: (row: ConnectorListItem) => row.created_at
      },
      updated_at: {
        header: 'Updated',
        minWidth: 20,
        get: (row: ConnectorListItem) => row.updated_at
      }
    }, {
      printLine: this.log.bind(this)
    })
  }
}
