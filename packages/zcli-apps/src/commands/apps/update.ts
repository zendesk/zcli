import { Command, CliUx } from '@oclif/core'
import { getAllConfigs } from '../../utils/appConfig'
import { CLIError } from '@oclif/core/lib/errors'
import * as chalk from 'chalk'
import { getUploadJobStatus, updateProductInstallation } from '../../utils/uploadApp'
import { uploadAppPkg, deployApp } from '../../utils/createApp'
import { getManifestFile } from '../../utils/manifest'
import { createAppPkg } from '../../lib/package'
import { Manifest, ZcliConfigFileContent } from '../../types'
import { validateAppPath } from '../../lib/appPath'

export default class Update extends Command {
  static description = 'updates an existing private app in the Zendesk products specified in the apps manifest file.'

  static args = [
    { name: 'appDirectories', required: true, default: '.' }
  ]

  static strict = false

  getAppID (appPath: string) {
    const allConfigs = getAllConfigs(appPath)
    const app_id = allConfigs ? allConfigs.app_id : undefined
    if (!app_id) { throw new CLIError(chalk.red('App ID not found')) }
    return app_id
  }

  async installApp (appConfig: ZcliConfigFileContent, uploadId: number, appPath: string, manifest: Manifest) {
    CliUx.ux.action.start('Deploying app')
    const { job_id } = await deployApp('PUT', `api/v2/apps/${appConfig.app_id}`, uploadId)

    try {
      const { app_id }: any = await getUploadJobStatus(job_id, appPath)
      CliUx.ux.action.stop('Deployed')

      Object.keys(manifest.location).forEach(async product => {
        if (!updateProductInstallation(appConfig, manifest, app_id, product)) {
          this.error(chalk.red(`Failed to update ${manifest.name} with app_id: ${app_id}`))
        }
      })
      this.log(chalk.green(`Successfully updated app: ${manifest.name} with app_id: ${app_id}`))
    } catch (error) {
      CliUx.ux.action.stop('Failed')
      this.error(chalk.red(error))
    }
  }

  async run () {
    const { argv: appDirectories } = await this.parse(Update)

    for (const appPath of appDirectories) {
      validateAppPath(appPath)

      CliUx.ux.action.start('Uploading app')
      const appConfig = getAllConfigs(appPath) || {}
      const manifest = getManifestFile(appPath)
      const pkgPath = await createAppPkg(appPath)
      const { id: upload_id } = await uploadAppPkg(pkgPath)

      if (!upload_id) {
        CliUx.ux.action.stop('Failed')
        this.error(`Failed to upload app ${manifest.name}`)
      }

      CliUx.ux.action.stop('Uploaded')
      try {
        await this.installApp(appConfig, upload_id, appPath, manifest)
      } catch (error) {
        this.error(chalk.red(error))
      }
    }
  }
}
