import { expect, test } from '@oclif/test'
import DeleteCommand from '../../src/commands/themes/delete'
import env from './env'
import * as sinon from 'sinon'

describe('themes:delete', function () {
  let fetchStub: sinon.SinonStub

  beforeEach(() => {
    fetchStub = sinon.stub(global, 'fetch')
  })

  afterEach(() => {
    fetchStub.restore()
  })

  describe('successful deletion', () => {
    const success = test
      .env(env)
      .do(() => {
        fetchStub.withArgs(sinon.match({
          url: 'https://z3ntest.zendesk.com/api/v2/guide/theming/themes/1234',
          method: 'DELETE'
        })).resolves({
          status: 204,
          ok: true,
          text: () => Promise.resolve('')
        })
      })

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
      .do(() => {
        fetchStub.withArgs(sinon.match({
          url: 'https://z3ntest.zendesk.com/api/v2/guide/theming/themes/1234',
          method: 'DELETE'
        })).resolves({
          status: 400,
          ok: false,
          text: () => Promise.resolve(JSON.stringify({
            errors: [{
              code: 'ThemeNotFound',
              title: 'Invalid id'
            }]
          }))
        })
      })
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
