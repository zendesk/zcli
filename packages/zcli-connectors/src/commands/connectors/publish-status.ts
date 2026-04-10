import { Command, Flags } from '@oclif/core'
import { existsSync, readFileSync } from 'fs'
import { join, resolve } from 'path'
import * as chalk from 'chalk'
import * as ora from 'ora'
import { getProvisioningStatus } from '../../lib/publish/status'

export default class PublishStatus extends Command {
  static description = 'check the provisioning status of a connector'

  static examples = [
    '<%= config.bin %> <%= command.id %>',
    '<%= config.bin %> <%= command.id %> ./my-connector'
  ]

  static flags = {
    help: Flags.help({ char: 'h' })
  }

  static args = [
    {
      name: 'path',
      description: 'path to connector directory (defaults to current directory)',
      required: false,
      default: '.'
    }
  ]

  async run (): Promise<void> {
    const { args } = await this.parse(PublishStatus)

    const connectorPath = resolve(args.path)
    const distPath = join(connectorPath, 'dist')
    const manifestPath = join(distPath, 'manifest.json')

    if (!existsSync(distPath)) {
      this.error(
        chalk.red(`Error: dist directory not found in ${connectorPath}. Please run 'zcli connectors:bundle' first to generate the dist folder.`),
        { exit: 1 }
      )
    }

    if (!existsSync(manifestPath)) {
      this.error(
        chalk.red(`Error: manifest.json not found in ${distPath}. Please run 'zcli connectors:bundle' first to generate the manifest.`),
        { exit: 1 }
      )
    }

    let connectorName: string
    try {
      const manifestContent = readFileSync(manifestPath, 'utf-8')
      const manifest = JSON.parse(manifestContent)

      connectorName = manifest.name
    } catch (error) {
      this.error(
        chalk.red(`Error reading manifest.json: ${error instanceof Error ? error.message : String(error)}`),
        { exit: 1 }
      )
    }

    if (!connectorName) {
      this.error(
        chalk.red('Error: Connector name not found in manifest.json'),
        { exit: 1 }
      )
    }

    const spinner = ora(`Fetching provisioning status for '${connectorName}'...`).start()

    try {
      const result = await getProvisioningStatus(connectorName)
      spinner.stop()

      this.log('')
      this.log(chalk.bold(`Connector: ${result.connectorName}  (v${result.version})`))
      this.log('')

      switch (result.status) {
      case 'PENDING_UPLOAD':
        this.log(chalk.yellow('Status: Waiting for upload'))
        this.log(chalk.cyan('  The connector code has not been uploaded yet. Run `zcli connectors:publish` to upload it.'))
        break

      case 'PENDING_VALIDATION':
        this.log(chalk.yellow('Status: Validating'))
        this.log(chalk.cyan('The connector has been received and is currently being validated. This usually takes a few minutes.'))
        break

      case 'SUCCESS':
        this.log(chalk.green('Status: Provisioned'))
        this.log(chalk.cyan('The connector has been successfully provisioned.'))
        break

      case 'FAILED':
        this.log(chalk.red('Status: Failed'))
        this.log(chalk.red(`Provisioning failed: ${result.reason ?? 'No reason provided.'}`))
        break

      default:
        this.log(chalk.yellow(`Status: ${result.status}`))
        if (result.reason) {
          this.log(chalk.cyan(`   ${result.reason}`))
        }
      }

      this.log('')
    } catch (error) {
      spinner.fail(chalk.red(`Failed to fetch status for '${connectorName}'`))
      const errorMessage = (error instanceof Error) ? error.message : String(error)
      this.error(errorMessage, { exit: 1 })
    }
  }
}
