import { Command, Flags, CliUx } from '@oclif/core'
import { request } from '@zendesk/zcli-core'
import * as chalk from 'chalk'
import getBrandId from '../../lib/getBrandId'

export default class List extends Command {
  static description = 'list installed themes'

  static enableJsonFlag = true

  static flags = {
    brandId: Flags.string({ description: 'The id of the brand where the themes are installed' })
  }

  static examples = [
    '$ zcli themes:list --brandId=123456'
  ]

  static strict = false

  async run () {
    let { flags: { brandId } } = await this.parse(List)

    brandId = brandId || await getBrandId()

    try {
      CliUx.ux.action.start('Listing themes')
      const { data: { themes } } = await request.requestAPI(`/api/v2/guide/theming/themes?brand_id=${brandId}`, {
        headers: {
          'X-Zendesk-Request-Originator': 'zcli themes:list'
        },
        validateStatus: (status: number) => status === 200
      })
      CliUx.ux.action.stop('Ok')
      this.log(chalk.green('Themes listed successfully'), themes)
      return { themes }
    } catch (e: any) {
      const [error] = e.response.data.errors
      this.error(`${error.code} - ${error.title}`)
    }
  }
}
