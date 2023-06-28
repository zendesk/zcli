import { expect, test } from '@oclif/test'
import PublishCommand from '../../src/commands/themes/publish'

describe('themes:publish', function () {
  describe('successful publish', () => {
    test
      .env({
        ZENDESK_SUBDOMAIN: 'z3ntest',
        ZENDESK_EMAIL: 'admin@z3ntest.com',
        ZENDESK_PASSWORD: '123456' // the universal password
      })
      .nock('https://z3ntest.zendesk.com', api => api
        .post('/api/v2/guide/theming/themes/1234/publish')
        .reply(200))
      .stdout()
      .it('should display success message when the theme is published successfully', async ctx => {
        await PublishCommand.run(['--themeId', '1234'])
        expect(ctx.stdout).to.contain('Theme published successfully theme ID: 1234')
      })
  })

  describe('publish failure', () => {
    test
      .env({
        ZENDESK_SUBDOMAIN: 'z3ntest',
        ZENDESK_EMAIL: 'admin@z3ntest.com',
        ZENDESK_PASSWORD: '123456' // the universal password
      })
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
          expect(error.message).to.contain('ThemeNotFound - Invalid id')
        }
      })
  })
})
