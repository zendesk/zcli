import { Command } from '@oclif/command'
import { request } from '@zendesk/zcli-core'
import { promptAndGetSettings, uploadAppPkg, deployApp } from '../../utils/createApp'
import * as chalk from 'chalk'
import { getUploadJobStatus } from '../../utils/uploadApp'
import cli from 'cli-ux'
import { getManifestFile } from '../../utils/manifest'
import { createAppPkg } from '../../lib/package'
import { validateAppPath } from '../../lib/appPath'
import { getAllConfigs } from '../../utils/appConfig'
import { getAppSettings } from '../../utils/getAppSettings'

export default class Create extends Command {
  static description = 'creates apps in your desired target account'

  static args = [
    { name: 'appDirectories', required: true, default: '.' }
  ]

  static examples = [
    '$ zcli apps:create ./app',
    '$ zcli apps:create ./app1 ./app2'
  ]

  static strict = false

  async run () {
    const { argv: appDirectories } = this.parse(Create)

    for (const appPath of appDirectories) {
      validateAppPath(appPath)

      cli.action.start('Uploading app')

      const manifest = getManifestFile(appPath)
      const pkgPath = await createAppPkg(appPath)
      const { id: upload_id } = await uploadAppPkg(pkgPath)

      if (!upload_id) {
        cli.action.stop('Failed')
        this.error(`Failed to upload app ${manifest.name}`)
      }

      cli.action.stop('Uploaded')
      cli.action.start('Deploying app')
      const { job_id } = await deployApp('POST', 'api/apps.json', upload_id, manifest.name)

      try {
        const { app_id }: any = await getUploadJobStatus(job_id, appPath)
        cli.action.stop('Deployed')

        const allConfigs = getAllConfigs(appPath)
        const configParams = allConfigs?.parameters || {} // if there are no parameters in the config, just attach an empty object

        const settings = manifest.parameters ? await getAppSettings(manifest, configParams) : {}
        const installed = await request.requestAPI('api/v2/apps/installations.json', {
          method: 'POST',
          body: JSON.stringify({ app_id: `${app_id}`, settings: { name: manifest.name, ...settings } }),
          headers: {
            'Content-Type': 'application/json'
          }
        })

        if (installed.status === 201 || installed.status === 200) {
          this.log(chalk.green(`Successfully installed app: ${manifest.name} with app_id: ${app_id}`))
        } else {
          this.error(chalk.red(`Failed to install ${manifest.name} with app_id: ${app_id}`))
        }
      } catch (error) {
        cli.action.stop('Failed')
        this.error(chalk.red(error))
      }
    }
  }
}
