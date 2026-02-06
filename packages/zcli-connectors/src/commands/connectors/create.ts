import { Command, Flags } from '@oclif/core'
import chalk = require('chalk')
import { execSync } from 'child_process'
import { copyFileSync, existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'fs'
import { mkdirSync } from 'fs-extra'
import { dirname, join, resolve } from 'path'

export default class Create extends Command {
  static examples = [
    '<%= config.bin %> <%= command.id %> connector-name'
  ]

  static flags = {
    help: Flags.help({ char: 'h' }),
    author: Flags.string({
      char: 'a',
      description: 'Author of the connector',
      required: true
    })
  }

  static args = [
    {
      name: 'connector',
      description: 'Name of the connector',
      required: true
    }
  ]

  async run (): Promise<void> {
    const { args, flags } = await this.parse(Create)
    const { connector } = args
    this.log(`creating ${connector} connector ...`)

    const cwd = process.cwd()
    const __connectorDir = resolve(cwd, `./${connector}`)
    if (existsSync(__connectorDir)) {
      this.error(chalk.cyan(`Error: Directory ${connector} already exists in ${cwd}`))
    }

    const __dirname = dirname(__filename)
    const __starterTemplateDir = resolve(__dirname, './../../templates/starter')
    copyDirectory(__starterTemplateDir, __connectorDir)

    const packageJsonPath = join(__connectorDir, 'package.json')
    replaceInFile(packageJsonPath, {
      '@connectors/templates-starter': `@connectors/${connector}`
    })

    const indexTsPath = join(__connectorDir, 'src/index.ts')
    replaceInFile(indexTsPath, {
      "name: 'starter'": `name: '${connector}'`,
      "title: 'Starter Connector'": `title: '${toTitleCase(connector)}'`,
      "description: 'Starter Connector'": `description: '${toTitleCase(connector)} connector'`,
      "author: 'starter-author'": `author: '${flags.author}'`
    })

    this.log(`✅ Connector '${connector}' created successfully!`)
    this.log(`📁 Location: ${__connectorDir}`)
    this.log('')
    this.log('Installing dependencies...')

    try {
      execSync('pnpm install', { cwd: __connectorDir, stdio: 'inherit' })
      this.log(chalk.green('✅ Dependencies installed!'))
    } catch {
      this.error(chalk.red('⚠️  Failed to install dependencies. Run `pnpm install` manually.'))
    }
  }
}

function replaceInFile (filePath: string, replacements: Record<string, string>) {
  let content = readFileSync(filePath, 'utf8')

  for (const [search, replace] of Object.entries(replacements)) {
    content = content.split(search).join(replace)
  }

  writeFileSync(filePath, content, 'utf8')
}

function toTitleCase (str: string) {
  return str
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function copyDirectory (srcDir: string, destDir: string) {
  if (!existsSync(destDir)) {
    mkdirSync(destDir, { recursive: true })
  }

  const files = readdirSync(srcDir)

  for (const file of files) {
    const srcPath = join(srcDir, file)
    const destPath = join(destDir, file)
    const stat = statSync(srcPath)

    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== 'dist') {
        copyDirectory(srcPath, destPath)
      }
    } else {
      copyFileSync(srcPath, destPath)
    }
  }
}
