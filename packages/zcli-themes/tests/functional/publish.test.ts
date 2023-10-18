import { expect, test } from '@oclif/test'
import PublishCommand from '../../src/commands/themes/publish'
import env from './env'

describe('themes:publish', function () {
  describe('successful publish', () => {
    const success = test
      .env(env)
      .nock('https://z3ntest.zendesk.com', api => api
        .post('/api/v2/guide/theming/themes/1234/publish')
        .reply(200))

    success
      .stdout()
      .it('should display success message when the theme is published successfully', async ctx => {
        await PublishCommand.run(['--themeId', '1234'])
        expect(ctx.stdout).to.contain('Theme published successfully theme ID: 1234')
      })

    success
      .stdout()
      .it('should return an object containing the theme ID when ran with --json', async ctx => {
        await PublishCommand.run(['--themeId', '1234', '--json'])
        expect(ctx.stdout).to.equal(JSON.stringify({ themeId: '1234' }, null, 2) + '\n')
      })
  })

  describe('publish failure', () => {
    test
      .env(env)
      .nock('https://z3ntest.zendesk.com', api => api
        .post('/api/v2/guide/theming/themes/1234/publish')
        .reply(400, {
          errors: [{
            code: 'ThemeNotFound',
            title: 'Invalid id'
          }]
        }))
      .stderr()
      .it('should report publish errors', async ctx => {
        try {
          await PublishCommand.run(['--themeId', '1234'])
        } catch (error) {
          expect(ctx.stderr).to.contain('!')
          expect(error.message).to.contain('ThemeNotFound')
          expect(error.message).to.contain('Invalid id')
        }
      })
  })
})
