import { expect, test } from '@oclif/test'
import ListCommand from '../../src/commands/themes/list'
import env from './env'

describe('themes:list', function () {
  describe('successful list', () => {
    const success = test
      .env(env)
      .nock('https://z3ntest.zendesk.com', api => api
        .get('/api/v2/guide/theming/themes?brand_id=1111')
        .reply(200, { themes: [] }))

    success
      .stdout()
      .it('should display success message when thes themes are listed successfully', async ctx => {
        await ListCommand.run(['--brandId', '1111'])
        expect(ctx.stdout).to.contain('Themes listed successfully []')
      })

    success
      .stdout()
      .it('should return an object containing the theme ID when ran with --json', async ctx => {
        await ListCommand.run(['--brandId', '1111', '--json'])
        expect(ctx.stdout).to.equal(JSON.stringify({ themes: [] }, null, 2) + '\n')
      })
  })

  describe('list failure', () => {
    test
      .env(env)
      .nock('https://z3ntest.zendesk.com', api => api
        .get('/api/v2/guide/theming/themes?brand_id=1111')
        .reply(500, {
          errors: [{
            code: 'InternalError',
            title: 'Something went wrong'
          }]
        }))
      .stderr()
      .it('should report publish errors', async ctx => {
        try {
          await ListCommand.run(['--brandId', '1111'])
        } catch (error) {
          expect(ctx.stderr).to.contain('!')
          expect(error.message).to.contain('InternalError - Something went wrong')
        }
      })
  })
})
