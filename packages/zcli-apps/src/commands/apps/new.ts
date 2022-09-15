import { FsExtraError, ManifestPath } from './../../types'
import { Command, Flags, CliUx } from '@oclif/core'
import { cleanDirectory } from '../../utils/fileUtils'
import { getManifestFile, updateManifestFile } from '../../utils/manifest'
import * as fs from 'fs'
import * as fsExtra from 'fs-extra'
import * as https from 'https'
import * as path from 'path'
import * as AdmZip from 'adm-zip'
import * as chalk from 'chalk'
import { CLIError } from '@oclif/core/lib/errors'

export default class New extends Command {
  static description = 'generates a bare bones app locally for development'

  static flags = {
    scaffold: Flags.string({ default: 'basic', description: 'Choose from open-source Zendesk app scaffold structures' }),
    path: Flags.string({ description: 'Path of your new app' }),
    authorName: Flags.string({ description: 'Name of app author' }),
    authorEmail: Flags.string({ description: 'Email of app author' }),
    appName: Flags.string({ description: 'Name of the app' }),
    authorURL: Flags.string({ description: 'URL of the app author' })
  }

  static examples = [
    '$ zcli apps:new',
    '$ zcli apps:new --scaffold=basic',
    '$ zcli apps:new --scaffold=react'
  ]

  zipScaffoldPath = path.join(process.cwd(), 'scaffold.zip')
  unzippedScaffoldPath = path.join(process.cwd(), 'app_scaffolds-master')
  EMAIL_REGEX = /^.+@.+\..+$/
  URL_REGEX = /[(http(s)?):(www)?a-zA-Z0-9@:%._~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_.~#?&//=]*)/

  async downloadScaffoldsRepo (url: string) {
    return new Promise<void>((resolve, reject) => {
      const destination = fs.createWriteStream(this.zipScaffoldPath)

      https.get(url, (response) => {
        response.pipe(destination)
      })

      destination.on('finish', () => {
        const zip = new AdmZip(this.zipScaffoldPath)
        const overwrite = false
        zip.extractAllToAsync(path.join(process.cwd()), overwrite, true, async (err) => {
          await cleanDirectory(this.zipScaffoldPath)
          if (err) {
            reject(err)
          }
          resolve()
        })
      })
    })
  }

  async extractScaffoldIfExists (flagScaffold: string, directoryName: string) {
    return new Promise<void>((resolve, reject) => {
      fsExtra.copy(
        path.join(process.cwd(), '/', 'app_scaffolds-master/packages/', flagScaffold),
        path.join(process.cwd(), directoryName),
        { overwrite: true, errorOnExist: true }, async (err: Error) => {
          await cleanDirectory(this.unzippedScaffoldPath)
          if (err) {
            const fsExtraError = err as FsExtraError
            if (fsExtraError.code === 'ENOENT') {
              reject(new Error(`Scaffold ${flagScaffold} does not exist: ${err}`))
            }
            reject(err)
          }
          resolve()
        }
      )
    })
  }

  // Added optional "authorURL param to object"
  modifyManifest (directoryName: string, appName: string, authorName: string, authorEmail: string, flagScaffold: string, authorURL?: string) {
    const manifestPath: ManifestPath = {
      basic: path.join(process.cwd(), directoryName),
      react: path.join(process.cwd(), directoryName, 'src')
    }
    const manifest = getManifestFile(manifestPath[flagScaffold])

    manifest.name = appName
    manifest.author.name = authorName
    manifest.author.email = authorEmail

    if (authorURL?.trim()) {
      manifest.author.url = authorURL
    } else {
      delete manifest.author.url
    }

    updateManifestFile(manifestPath[flagScaffold], manifest)
  }

  async run () {
    const { flags } = await this.parse(New)
    const flagScaffold = flags.scaffold
    const directoryName = flags.path || await CliUx.ux.prompt('Enter a directory name to save the new app (will create the dir if it does not exist)')
    const authorName = flags.authorName || await CliUx.ux.prompt('Enter this app authors name')
    let authorEmail = flags.authorEmail || await CliUx.ux.prompt('Enter this app authors email')

    while (!this.EMAIL_REGEX.test(authorEmail)) {
      console.log(chalk.red('Invalid email, please try again'))
      authorEmail = flags.authorEmail || await CliUx.ux.prompt('Enter this app authors email')
    }

    let authorURL = flags.authorURL || await CliUx.ux.prompt('Enter this apps URL (Optional)', { required: false })

    while (authorURL.trim() && !this.URL_REGEX.test(authorURL)) {
      console.log(chalk.red('Invalid URL, please try again (Press enter to skip)'))
      authorURL = await CliUx.ux.prompt('Enter this apps URL', { required: false })
    }

    const appName = flags.appName || await CliUx.ux.prompt('Enter a name for this new app')
    const scaffoldUrl = 'https://codeload.github.com/zendesk/app_scaffolds/zip/master'

    try {
      await this.downloadScaffoldsRepo(scaffoldUrl)
      await this.extractScaffoldIfExists(flagScaffold, directoryName)
    } catch (err) {
      throw new CLIError(chalk.red(`Download of scaffold structure failed with error: ${err}`))
    }

    this.modifyManifest(directoryName, appName, authorName, authorEmail, flagScaffold, authorURL)
    console.log(chalk.green(`Successfully created new project ${directoryName}`))
  }
}
