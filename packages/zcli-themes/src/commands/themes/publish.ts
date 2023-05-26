import { Command, Flags, CliUx } from '@oclif/core'
import { request } from '@zendesk/zcli-core'
import * as chalk from 'chalk'

export default class Publish extends Command {
  static description = 'publish a theme'

  static flags = {
    themeId: Flags.string({ description: 'The id of the theme to publish' })
  }

  static args = [
    { name: 'themeDirectory', required: true, default: '.' }
  ]

  static examples = [
    '$ zcli themes:publish --themeId=abcd'
  ]

  static strict = false

  async run () {
    let { flags: { themeId } } = await this.parse(Publish)

    themeId = themeId || await CliUx.ux.prompt('Theme ID')

    try {
      CliUx.ux.action.start('Publishing theme')
      await request.requestAPI(`/api/v2/guide/theming/themes/${themeId}/publish`, {
        method: 'post',
        headers: {
          'X-Zendesk-Request-Originator': 'zcli themes:publish'
        },
        validateStatus: (status: number) => status === 200
      })
      CliUx.ux.action.stop('Ok')
      this.log(chalk.green('Theme published successfully'), `theme ID: ${themeId}`)
    } catch (e: any) {
      const [error] = e.response.data.errors
      this.error(`${error.code} - ${error.title}`)
    }
  }
}
