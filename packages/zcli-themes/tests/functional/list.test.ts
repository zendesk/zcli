import { expect, test } from '@oclif/test'
import * as sinon from 'sinon'
import ListCommand from '../../src/commands/themes/list'
import env from './env'
import { CLIError } from '@oclif/core/lib/errors'

describe('themes:list', function () {
  let fetchStub: sinon.SinonStub

  beforeEach(() => {
    fetchStub = sinon.stub(global, 'fetch')
  })

  afterEach(() => {
    fetchStub.restore()
  })

  describe('successful list', () => {
    const success = test
      .env(env)
      .do(() => {
        fetchStub.withArgs(sinon.match({
          url: 'https://z3ntest.zendesk.com/api/v2/guide/theming/themes?brand_id=1111',
          method: 'GET'
        })).resolves({
          status: 200,
          ok: true,
          text: () => Promise.resolve(JSON.stringify({ themes: [] }))
        })
      })

    success
      .stdout()
      .it('should display success message when the themes are listed successfully', async ctx => {
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
      .do(() => {
        fetchStub.withArgs(sinon.match({
          url: 'https://z3ntest.zendesk.com/api/v2/guide/theming/themes?brand_id=1111',
          method: 'GET'
        })).resolves({
          status: 500,
          ok: false,
          text: () => Promise.resolve(JSON.stringify({
            errors: [{
              code: 'InternalError',
              title: 'Something went wrong'
            }]
          }))
        })
      })
      .stderr()
      .it('should report list errors', async ctx => {
        try {
          await ListCommand.run(['--brandId', '1111'])
        } catch (error) {
          expect(ctx.stderr).to.contain('!')
          expect((error as CLIError).message).to.contain('InternalError')
          expect((error as CLIError).message).to.contain('Something went wrong')
        }
      })
  })
})
