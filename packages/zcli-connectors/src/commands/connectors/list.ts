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
  static description = 'list all private connectors for the current account'

  static examples = [
    '<%= config.bin %> <%= command.id %>',
    '<%= config.bin %> <%= command.id %> --json'
  ]

  static flags = {
    help: Flags.help({ char: 'h' }),
    json: Flags.boolean({
      description: 'output in JSON format',
      default: false
    }),
    verbose: Flags.boolean({
      char: 'v',
      description: 'verbose output',
      default: false
    })
  }

  async run (): Promise<void> {
    const { flags } = await this.parse(List)

    if (flags.verbose) {
      this.logVerbose('Verbose mode enabled', flags.json)
    }

    const spinner = ora('Fetching connectors...').start()

    try {
      const response = await request.requestAPI('/flowstate/connectors/private/list', {
        method: 'GET'
      })

      spinner.stop()

      if (flags.verbose) {
        this.logVerbose(`API response status: ${response.status}`, flags.json)
        this.logVerbose(`Response data: ${JSON.stringify(response.data, null, 2)}`, flags.json)
      }

      const data = response.data as ListConnectorsResponse

      // JSON output mode: always emit JSON to stdout
      if (flags.json) {
        if (response.status !== 200) {
          // Route error to stderr and exit via outer catch; no human-readable output on stdout
          throw new Error(`API returned non-200 status: ${response.status}`)
        }

        const connectors = data.connectors ?? []
        this.log(JSON.stringify(connectors, null, 2))
        return
      }

      // Non-JSON output mode
      if (response.status !== 200) {
        const errorMsg = `API returned non-200 status: ${response.status}`
        const responseData = JSON.stringify(response.data, null, 2)

        if (flags.json) {
          // In JSON mode, write error details to stderr
          process.stderr.write(chalk.red(errorMsg) + '\n')
          process.stderr.write(chalk.yellow('Response data: ') + responseData + '\n')
        } else {
          this.log(chalk.red(errorMsg))
          this.log(chalk.yellow('Response data:'), responseData)
        }
        return
      }

      if (!data.connectors || data.connectors.length === 0) {
        if (flags.json) {
          this.log(JSON.stringify([], null, 2))
        } else {
          this.log(chalk.yellow('No connectors found'))
        }
        return
      }

      this.displayTable(data.connectors)
    } catch (error) {
      if (!flags.json) {
        spinner.fail(chalk.red('Failed to fetch connectors'))
      }

      const errorMessage = (error instanceof Error) ? error.message : String(error)

      if (flags.verbose) {
        this.logVerbose('\nError Details:', flags.json, 'red')
        this.logVerbose(errorMessage, flags.json)
      }

      this.error(errorMessage, { exit: 1 })
    }
  }

  private logVerbose (message: string, isJsonMode: boolean, color?: 'cyan' | 'red'): void {
    const coloredMessage = color ? chalk[color](message) : chalk.cyan(message)
    if (isJsonMode) {
      // Write to stderr to avoid corrupting JSON output on stdout
      process.stderr.write(coloredMessage + '\n')
    } else {
      this.log(coloredMessage)
    }
  }

  private displayTable (connectors: ConnectorListItem[]): void {
    this.log(chalk.green(`\nFound ${connectors.length} connector(s):\n`))

    CliUx.ux.table(connectors, {
      connector_nice_id: {
        header: 'ID',
        minWidth: 25,
        get: (row: ConnectorListItem) => row.connector_nice_id || row.connector_name
      },
      title: {
        header: 'Title',
        minWidth: 30,
        get: (row: ConnectorListItem) => row.title || row.connector_name
      },
      connector_name: {
        header: 'Connector Name',
        minWidth: 25
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
