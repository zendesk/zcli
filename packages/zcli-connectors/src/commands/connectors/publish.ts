import { Command, Flags } from '@oclif/core'
import { existsSync } from 'fs'
import { resolve, join } from 'path'
import * as chalk from 'chalk'
import * as ora from 'ora'
import { runValidationChecks } from '../../lib/validations'
import { createConnector, uploadConnectorPackage } from '../../lib/publish/publish'
import { pollProvisioningStatus } from '../../lib/publish/poller'

export default class Publish extends Command {
  static description = 'publish a connector to the current account'

  static examples = [
    '<%= config.bin %> <%= command.id %> ./example-connector',
    '<%= config.bin %> <%= command.id %> ./example-connector --validationOnly'
  ]

  static flags = {
    help: Flags.help({ char: 'h' }),
    validationOnly: Flags.boolean({
      description: 'validate the connector without publishing',
      default: false
    }),
    verbose: Flags.boolean({
      char: 'v',
      description: 'verbose output',
      default: false
    })
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
    const { args, flags } = await this.parse(Publish)

    let inputPath = resolve(args.path)

    const distPath = join(inputPath, 'dist')
    if (existsSync(distPath)) {
      inputPath = distPath
    }

    if (!existsSync(inputPath)) {
      this.error(chalk.red(`Error: Directory ${inputPath} does not exist. Please run the bundle command first to generate the dist folder.`), { exit: 1 })
    }

    if (flags.verbose) {
      this.log(chalk.cyan('Verbose mode enabled'))
      this.log(chalk.cyan(`Resolved Input path: ${inputPath}`))
      this.log(chalk.cyan(`Validation only: ${flags.validationOnly ? 'enabled' : 'disabled'}`))
    }

    try {
      await this.validateConnector(inputPath, flags)
      if (!flags.validationOnly) {
        await this.publishConnector(inputPath)
      } else {
        this.log(chalk.green('✓ Connector validation completed successfully!'))
      }
    } catch (error) {
      const errorMessage = (error instanceof Error) ? error.message : String(error)

      if (flags.verbose) {
        this.log('\n' + chalk.red('Error Details:'))
        this.log(errorMessage)
      }

      this.error(errorMessage, { exit: 1 })
    }
  }

  private async validateConnector (
    path: string,
    flags: { verbose: boolean; validationOnly: boolean }
  ): Promise<void> {
    const spinner = ora('Validating connector...').start()

    try {
      await runValidationChecks(path, { verbose: flags.verbose }, (message: string) => this.log(message))
      spinner.succeed(chalk.green('Validation passed'))
    } catch (error) {
      spinner.fail(chalk.red('Validation failed'))
      throw error
    }
  }

  private async publishConnector (
    path: string
  ): Promise<void> {
    let spinner = ora('Publishing connector...').start()
    try {
      const { uploadUrl, connectorName, provisioningId } = await createConnector(path)
      await uploadConnectorPackage(path, uploadUrl, connectorName)
      spinner.succeed(chalk.green('Upload complete'))

      spinner = ora('Waiting for connector provisioning...').start()
      const { status: finalStatus, reason } = await pollProvisioningStatus(connectorName, provisioningId)

      if (finalStatus === 'SUCCESS') {
        spinner.succeed(chalk.green('Connector provisioned successfully!'))
      } else if (finalStatus === 'FAILED') {
        spinner.fail(chalk.red('Connector provisioning failed'))
        throw new Error(`Connector provisioning failed: ${reason ?? 'Unknown reason'}`)
      } else if (finalStatus === 'ABORTED') {
        spinner.fail(chalk.yellow('Connector provisioning was aborted'))
        throw new Error(`Connector provisioning was aborted: ${reason ?? 'Unknown reason'}`)
      }
    } catch (error) {
      spinner.fail(chalk.red('Publish failed'))
      throw error
    }
  }
}
