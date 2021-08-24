import { FsExtraError, ManifestPath } from './../../types'
import { Command, flags } from '@oclif/command'
import { cleanDirectory } from '../../utils/fileUtils'
import { getManifestFile, updateManifestFile } from '../../utils/manifest'
import cli from 'cli-ux'
import * as fs from 'fs'
import * as fsExtra from 'fs-extra'
import * as https from 'https'
import * as path from 'path'
import * as AdmZip from 'adm-zip'
import * as chalk from 'chalk'
import { CLIError } from '@oclif/errors'

async function tryCleanUp (path: string) {
  try {
    await cleanDirectory(path)
  } catch (err) {
    console.log(chalk.yellow(`Failed to clean up ${path}`))
  }
}

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
  unzippedScaffoldPath = path.join(process.cwd(), 'app_scaffolds-master')
  EMAIL_REGEX = /^.+@.+\..+$/

  async downloadScaffoldsRepo (url: string) {
    return new Promise((resolve, reject) => {
      const destination = fs.createWriteStream(this.zipScaffoldPath)

      https.get(url, (response) => {
        response.pipe(destination)
      })

      destination.on('finish', () => {
        const zip = new AdmZip(this.zipScaffoldPath)
        const overwrite = false
        zip.extractAllToAsync(path.join(process.cwd()), overwrite, (err) => {
          tryCleanUp(this.zipScaffoldPath)
          if (err) {
            reject(err)
          }
          resolve()
        })
      })
    })
  }

  async extractScaffoldIfExists (flagScaffold: string) {
    return new Promise((resolve, reject) => {
      fsExtra.copy(
        path.join(process.cwd(), '/', 'app_scaffolds-master/packages/', flagScaffold),
        path.join(process.cwd(), '/', `app_scaffolds-master-${flagScaffold}`),
        { overwrite: true, errorOnExist: true }, (err: FsExtraError) => {
          if (err) {
            if (err.code === 'ENOENT') {
              reject(new Error(`Scaffold ${flagScaffold} does not exist: ${err}`))
            }
            reject(err)
          }
          resolve()
        }
      )
    })
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
    const scaffoldDir = 'app_scaffolds-master-' + flagScaffold
    const scaffoldUrl = 'https://codeload.github.com/zendesk/app_scaffolds/zip/master'

    try {
      await this.downloadScaffoldsRepo(scaffoldUrl)
      await this.extractScaffoldIfExists(flagScaffold)
      await cleanDirectory(this.unzippedScaffoldPath)
    } catch (err) {
      await tryCleanUp(this.unzippedScaffoldPath)
      throw new CLIError(chalk.red(`Download of scaffold structure failed with error: ${err}`))
    }

    fs.renameSync(path.join(process.cwd(), scaffoldDir), path.join(process.cwd(), directoryName))
    this.modifyManifest(directoryName, appName, authorName, authorEmail, flagScaffold)
    console.log(chalk.green(`Successfully created new project ${directoryName}`))
  }
}
