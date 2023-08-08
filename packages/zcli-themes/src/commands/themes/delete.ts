import { Command, Flags, CliUx } from '@oclif/core'
import { request } from '@zendesk/zcli-core'
import * as chalk from 'chalk'

export default class Delete extends Command {
  static description = 'delete a theme'

  static enableJsonFlag = true

  static flags = {
    themeId: Flags.string({ description: 'The id of the theme to delete' })
  }

  static examples = [
    '$ zcli themes:delete --themeId=abcd'
  ]

  static strict = false

  async run () {
    let { flags: { themeId } } = await this.parse(Delete)

    themeId = themeId || await CliUx.ux.prompt('Theme ID')

    try {
      CliUx.ux.action.start('Deleting theme')
      await request.requestAPI(`/api/v2/guide/theming/themes/${themeId}`, {
        method: 'delete',
        headers: {
          'X-Zendesk-Request-Originator': 'zcli themes:delete'
        },
        validateStatus: (status: number) => status === 204
      })
      CliUx.ux.action.stop('Ok')
      this.log(chalk.green('Theme deleted successfully'), `theme ID: ${themeId}`)
      return { themeId }
    } catch (e: any) {
      const [error] = e.response.data.errors
      this.error(`${error.code} - ${error.title}`)
    }
  }
}
