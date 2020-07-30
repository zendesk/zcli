import { Scaffolds, ManifestPath } from './../../types'
import { Command, flags } from '@oclif/command'
import { cleanDirectory } from '../../utils/fileUtils'
import { getManifestFile, updateManifestFile } from '../../utils/manifest'
import cli from 'cli-ux'
import * as fs from 'fs'
import * as https from 'https'
import * as path from 'path'
import * as AdmZip from 'adm-zip'
import * as chalk from 'chalk'
import { CLIError } from '@oclif/errors'

export default class New extends Command {
  static description = 'generates a bare bones app locally for development'

  static flags = {
    scaffold: flags.string({ default: 'basic', description: 'Choose from open-source Zendesk app scaffold structures' }),
    path: flags.string({ description: 'Path of your new app' }),
    authorName: flags.string({ description: 'Name of app author' }),
    authorEmail: flags.string({ description: 'Email of app author' }),
    appName: flags.string({ description: 'Name of the app' })
  }

  static examples = [
    '$ zcli apps:new',
    '$ zcli apps:new --scaffold=basic',
    '$ zcli apps:new --scaffold=react'
  ]

  zipScaffoldPath = path.join(process.cwd(), 'scaffold.zip')
  EMAIL_REGEX = /^.+@.+\..+$/

  async downloadScaffold (url: string) {
    return new Promise((resolve, reject) => {
      const destination = fs.createWriteStream(this.zipScaffoldPath)

      https.get(url, (response) => {
        response.pipe(destination)
      })

      destination.on('finish', () => {
        const zip = new AdmZip(this.zipScaffoldPath)
        const overwrite = false
        zip.extractAllToAsync(path.join(process.cwd()), overwrite, (err) => {
          if (err) {
            reject(err)
          }
          resolve()
        })
      })
    })
  }

  getScaffoldDir (flagScaffold: string): string {
    const scaffolds: Scaffolds = {
      basic: 'apps_scaffold_basic',
      react: 'app_scaffold'
    }
    const scaffoldRepo = scaffolds[flagScaffold]
    if (!scaffoldRepo) {
      throw new CLIError(chalk.red(`Invalid scaffold option entered ${flagScaffold}`))
    }
    return scaffoldRepo
  }

  modifyManifest (directoryName: string, appName: string, authorName: string, authorEmail: string, flagScaffold: string) {
    const manifestPath: ManifestPath = {
      basic: path.join(process.cwd(), directoryName),
      react: path.join(process.cwd(), directoryName, 'src')
    }
    const manifest = getManifestFile(manifestPath[flagScaffold])

    manifest.name = appName
    manifest.author.name = authorName
    manifest.author.email = authorEmail
    updateManifestFile(manifestPath[flagScaffold], manifest)
  }

  async run () {
    const { flags } = this.parse(New)
    const flagScaffold = flags.scaffold
    const directoryName = flags.path || await cli.prompt('Enter a directory name to save the new app (will create the dir if it does not exist)')
    const authorName = flags.authorName || await cli.prompt('Enter this app authors name')
    let authorEmail = flags.authorEmail || await cli.prompt('Enter this app authors email')
    while (!this.EMAIL_REGEX.test(authorEmail)) {
      console.log(chalk.red('Invalid email, please try again'))
      authorEmail = flags.authorEmail || await cli.prompt('Enter this app authors email')
    }
    const appName = flags.appName || await cli.prompt('Enter a name for this new app')
    const scaffoldRepo = this.getScaffoldDir(flagScaffold)
    const scaffoldDir = scaffoldRepo + '-master'

    const scaffoldUrl = `https://codeload.github.com/zendesk/${scaffoldRepo}/zip/master`

    try {
      await this.downloadScaffold(scaffoldUrl)
    } catch (err) {
      throw new CLIError(chalk.red('Download of scaffold structure failed'))
    }

    fs.renameSync(path.join(process.cwd(), scaffoldDir), path.join(process.cwd(), directoryName))
    this.modifyManifest(directoryName, appName, authorName, authorEmail, flagScaffold)
    try {
      await cleanDirectory(this.zipScaffoldPath)
    } catch (err) {
      console.log(chalk.yellow(`Failed to clean up ${this.zipScaffoldPath}`))
    }
    console.log(chalk.green(`Successfully created new project ${directoryName}`))
  }
}
