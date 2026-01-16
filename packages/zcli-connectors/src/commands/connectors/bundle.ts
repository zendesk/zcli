import { Command, Flags } from '@oclif/core'
import { existsSync, mkdirSync } from 'fs'
import { join, resolve } from 'path'
import * as chalk from 'chalk'
import { ViteConfigBuilder, ViteRunner } from '../../lib/vite'
import * as ora from 'ora'

export default class Bundle extends Command {
  static examples = [
    '<%= config.bin %> <%= command.id %> ./example-connector',
    '<%= config.bin %> <%= command.id %> ./example-connector --output ./bundled',
    '<%= config.bin %> <%= command.id %> --input ./dist --output ./bundle'
  ]

  static flags = {
    help: Flags.help({ char: 'h' }),
    input: Flags.string({
      char: 'i',
      description: 'input directory containing built connector files',
      default: '.'
    }),
    output: Flags.string({
      char: 'o',
      description: 'output directory for bundled files'
    }),
    verbose: Flags.boolean({
      char: 'v',
      description: 'verbose output',
      default: false
    }),
    watch: Flags.boolean({
      char: 'w',
      description: 'watch for changes and rebuild',
      default: false
    })
  }

  static args = [
    {
      name: 'path',
      description: 'path to connector directory (will use dist/ folder inside)'
    }
  ]

  async run (): Promise<void> {
    const { args, flags } = await this.parse(Bundle)

    let inputPath: string
    if (args.path) {
      inputPath = resolve(join(args.path, 'src'))
    } else {
      inputPath = resolve(flags.input)
    }

    const outputPath = flags.output ? resolve(flags.output) : resolve('dist')
    if (!existsSync(outputPath)) {
      mkdirSync(outputPath, { recursive: true })
    }

    const spinner = ora(
      `Bundling connector from ${inputPath} to ${outputPath}...`
    ).start()

    try {
      await this.generateViteBundle(inputPath, outputPath, flags, spinner)

      if (flags.watch) {
        spinner.succeed(
          chalk.green('Watching for changes... (Press Ctrl+C to stop)')
        )
      } else {
        spinner.succeed(chalk.green('Bundle created successfully!'))
      }
    } catch (error) {
      spinner.fail(chalk.red('Failed to bundle the connector'))

      if (error instanceof Error) {
        this.log('\n' + chalk.red('Error Details:'))
        this.log(error.message)
      }
    }
  }

  private async generateViteBundle (
    inputPath: string,
    outputPath: string,
    flags: { watch: boolean },
    spinner: ora.Ora
  ): Promise<void> {
    const { watch } = flags
    const viteConfig = ViteConfigBuilder.createConfig(
      {
        inputPath,
        outputPath,
        useLocalWorkspace: false,
        watch
      },
      this
    )

    spinner.text = watch
      ? 'Building connector and watching for changes...'
      : 'Building connector...'
    const stats = await ViteRunner.run(viteConfig)

    if (stats.hasErrors()) {
      spinner.fail(chalk.red('Bundle failed with errors!'))

      const errors = stats.toJson().errors || []
      errors.forEach((error: any) => {
        this.log(chalk.red(`Error: ${error.message}`))
      })

      throw new Error('Connector build failed')
    }

    if (stats.hasWarnings()) {
      const warnings = stats.toJson().warnings || []
      this.log(chalk.yellow('\nWarnings:'))
      warnings.forEach((warning: any) => {
        this.log(chalk.yellow(`  - ${warning.message}`))
      })
    }
  }
}
