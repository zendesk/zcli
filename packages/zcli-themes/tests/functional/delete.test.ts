import { expect, test } from '@oclif/test'
import DeleteCommand from '../../src/commands/themes/delete'
import env from './env'

describe('themes:delete', function () {
  describe('successful deletion', () => {
    const success = test
      .env(env)
      .nock('https://z3ntest.zendesk.com', api => api
        .delete('/api/v2/guide/theming/themes/1234')
        .reply(204))

    success
      .stdout()
      .it('should display success message when the theme is deleted successfully', async ctx => {
        await DeleteCommand.run(['--themeId', '1234'])
        expect(ctx.stdout).to.contain('Theme deleted successfully theme ID: 1234')
      })

    success
      .stdout()
      .it('should return an object containing the theme ID when ran with --json', async ctx => {
        await DeleteCommand.run(['--themeId', '1234', '--json'])
        expect(ctx.stdout).to.equal(JSON.stringify({ themeId: '1234' }, null, 2) + '\n')
      })
  })

  describe('delete failure', () => {
    test
      .env(env)
      .nock('https://z3ntest.zendesk.com', api => api
        .delete('/api/v2/guide/theming/themes/1234')
        .reply(400, {
          errors: [{
            code: 'ThemeNotFound',
            title: 'Invalid id'
          }]
        }))
      .stderr()
      .it('should report delete errors', async ctx => {
        try {
          await DeleteCommand.run(['--themeId', '1234'])
        } catch (error) {
          expect(ctx.stderr).to.contain('!')
          expect(error.message).to.contain('ThemeNotFound')
          expect(error.message).to.contain('Invalid id')
        }
      })
  })
})
