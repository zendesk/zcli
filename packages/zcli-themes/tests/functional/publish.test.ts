import { expect, test } from '@oclif/test'
import * as sinon from 'sinon'
import PublishCommand from '../../src/commands/themes/publish'
import env from './env'
import { CLIError } from '@oclif/core/lib/errors'

describe('themes:publish', function () {
  let fetchStub: sinon.SinonStub

  beforeEach(() => {
    fetchStub = sinon.stub(global, 'fetch')
  })

  afterEach(() => {
    fetchStub.restore()
  })

  describe('successful publish', () => {
    const success = test
      .env(env)
      .do(() => {
        fetchStub.withArgs(sinon.match({
          url: 'https://z3ntest.zendesk.com/api/v2/guide/theming/themes/1234/publish',
          method: 'POST'
        })).resolves({
          status: 200,
          ok: true,
          text: () => Promise.resolve('')
        })
      })

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
      .do(() => {
        fetchStub.withArgs(sinon.match({
          url: 'https://z3ntest.zendesk.com/api/v2/guide/theming/themes/1234/publish',
          method: 'POST'
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
      .it('should report publish errors', async ctx => {
        try {
          await PublishCommand.run(['--themeId', '1234'])
        } catch (error) {
          expect(ctx.stderr).to.contain('!')
          expect((error as CLIError).message).to.contain('ThemeNotFound')
          expect((error as CLIError).message).to.contain('Invalid id')
        }
      })
  })
})
