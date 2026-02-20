import { Command, Flags } from '@oclif/core'
import { existsSync } from 'fs'
import { resolve, join } from 'path'
import * as chalk from 'chalk'
import * as ora from 'ora'
import { runValidationChecks } from '../../lib/validations'
import { createConnector, uploadConnectorPackage } from '../../lib/publish/publish'

export default class Publish extends Command {
  static description = 'publish a connector'

  static examples = [
    '<%= config.bin %> <%= command.id %> --input ./example-connector --validationOnly',
    '<%= config.bin %> <%= command.id %> --input ./src --validationOnly',
    '<%= config.bin %> <%= command.id %> ./example-connector --validationOnly'
  ]

  static flags = {
    help: Flags.help({ char: 'h' }),
    input: Flags.string({
      char: 'i',
      description: 'input directory containing connector source files',
      default: '.'
    }),
    validationOnly: Flags.boolean({
      description: 'run validation checks only without publishing',
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
      description: 'path to connector directory'
    }
  ]

  async run (): Promise<void> {
    const { args, flags } = await this.parse(Publish)

    let inputPath: string
    if (args.path) {
      inputPath = resolve(args.path)
    } else {
      inputPath = resolve(flags.input)
    }

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
        this.log(chalk.green('✓ Connector published successfully!'))
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
    const spinner = ora('Publishing connector...').start()
    try {
      const { uploadUrl, connectorName } = await createConnector(path)
      await uploadConnectorPackage(path, uploadUrl, connectorName)
      spinner.succeed(chalk.green('Publish complete'))
    } catch (error) {
      spinner.fail(chalk.red('Publish failed'))
      throw error
    }
  }
}
