import { Command, Flags } from '@oclif/core'
import { existsSync, mkdirSync } from 'fs'
import { join, resolve } from 'path'
import * as chalk from 'chalk'
import { execFileSync } from 'child_process'
import { ViteConfigBuilder, ViteRunner } from '../../lib/vite'
import * as ora from 'ora'

export default class Bundle extends Command {
  static examples = [
    '<%= config.bin %> <%= command.id %> ./example-connector',
    '<%= config.bin %> <%= command.id %> ./example-connector --output ./bundled',
    '<%= config.bin %> <%= command.id %> --input ./src --output ./bundle'
  ]

  static flags = {
    help: Flags.help({ char: 'h' }),
    input: Flags.string({
      char: 'i',
      description: 'input directory containing connector source files',
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
      description: 'path to connector directory (will use src/ folder inside)'
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
      if (flags.verbose) {
        this.log(chalk.cyan(`Created output directory: ${outputPath}`))
      }
    }

    if (flags.verbose) {
      this.log(chalk.cyan('Verbose mode enabled'))
      this.log(chalk.cyan(`Resolved Input path: ${inputPath}`))
      this.log(chalk.cyan(`Resolved Output path: ${outputPath}`))
      this.log(chalk.cyan(`Watch mode: ${flags.watch ? 'enabled' : 'disabled'}`))
    }

    let spinner = ora('Checking TypeScript compilation...').start()

    try {
      this.checkTypeScript(inputPath, spinner)
      spinner.succeed(chalk.green('TypeScript compilation check passed'))

      spinner = ora(
        `Bundling connector from ${inputPath} to ${outputPath}...`
      ).start()

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

      const errorMessage = (error instanceof Error) ? error.message : String(error)
      if (flags.verbose) {
        this.log('\n' + chalk.red('Error Details:'))
        this.log(errorMessage)
      }

      this.error(errorMessage, { exit: 1 })
    }
  }

  private checkTypeScript (
    projectPath: string,
    spinner: ora.Ora
  ): void {
    try {
      const tsconfigPath = join(projectPath, 'tsconfig.json')
      if (!existsSync(tsconfigPath)) {
        spinner.stop()
        spinner.info(chalk.yellow('No tsconfig.json found, skipping type check'))
        return
      }

      spinner.text = chalk.cyan('Running TypeScript type check...')
      execFileSync('tsc', ['--noEmit', '--project', projectPath], { stdio: 'inherit' })
    } catch (error) {
      spinner.fail(chalk.red('TypeScript type check failed'))
      throw new Error('TypeScript compilation check failed. Please fix the errors above.')
    }
  }

  private async generateViteBundle (
    inputPath: string,
    outputPath: string,
    flags: { watch: boolean; verbose: boolean },
    spinner: ora.Ora
  ): Promise<void> {
    const { watch, verbose } = flags

    if (verbose) {
      this.log(chalk.cyan('Creating Vite configuration...'))
    }

    const viteConfig = ViteConfigBuilder.createConfig(
      {
        inputPath,
        outputPath,
        watch
      }
    )

    if (verbose) {
      spinner.stop()
      this.log(chalk.cyan('Vite configuration created successfully'))
      this.log(chalk.cyan('Starting build process...'))
      spinner.start()
    }

    spinner.text = watch
      ? 'Building connector and watching for changes...'
      : 'Building connector...'
    const stats = await ViteRunner.run(viteConfig)

    if (stats.hasErrors()) {
      spinner.fail(chalk.red('Bundle failed with errors!'))

      const errors = stats.toJson().errors || []
      this.log(chalk.cyan(`Found ${errors.length} error(s)`))
      errors.forEach((error: any) => {
        this.log(chalk.red(`Error: ${error.message}`))
      })

      throw new Error('Connector build failed')
    }

    if (verbose) {
      const buildInfo = stats.toJson()
      if (buildInfo.assets && buildInfo.assets.length > 0) {
        this.log(chalk.cyan(`Generated ${buildInfo.assets.length} asset(s)`))
        buildInfo.assets.forEach((asset: any) => {
          this.log(chalk.cyan(`  - ${asset.name} (${(asset.size / 1024).toFixed(2)} KB)`))
        })
      }
    }

    if (stats.hasWarnings()) {
      const warnings = stats.toJson().warnings || []
      if (verbose) {
        this.log(chalk.cyan(`Found ${warnings.length} warning(s)`))
      }
      this.log(chalk.yellow('\nWarnings:'))
      warnings.forEach((warning: any) => {
        this.log(chalk.yellow(`  - ${warning.message}`))
      })
    } else if (verbose) {
      this.log(chalk.cyan('No warnings found'))
    }
  }
}
