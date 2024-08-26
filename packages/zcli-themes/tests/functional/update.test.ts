import type { Job } from '../../../zcli-themes/src/types'
import { expect, test } from '@oclif/test'
import * as path from 'path'
import * as nock from 'nock'
import UpdateCommand from '../../src/commands/themes/update'
import env from './env'
import * as sinon from 'sinon'

describe('themes:update', function () {
  const baseThemePath = path.join(__dirname, 'mocks/base_theme')
  const job: Job = {
    id: '9999',
    status: 'pending',
    data: {
      theme_id: '1234',
      upload: {
        url: 'https://s3.com/upload/path',
        parameters: {}
      }
    }
  }
  let fetchStub: sinon.SinonStub

  beforeEach(() => {
    fetchStub = sinon.stub(global, 'fetch')
  })

  afterEach(() => {
    fetchStub.restore()
  })

  describe('successful update', () => {
    const success = test
      .env(env)
      .do(() => {
        fetchStub.withArgs(sinon.match({
          url: 'https://z3ntest.zendesk.com/api/v2/guide/theming/jobs/themes/updates',
        })).resolves({
          status: 202,
          ok: true,
          text: () => Promise.resolve(JSON.stringify({ job }))
        })

        fetchStub.withArgs(sinon.match({
          url: 'https://z3ntest.zendesk.com/api/v2/guide/theming/jobs/9999',
        })).resolves({
          status: 200,
          ok: true,
          text: () => Promise.resolve(JSON.stringify({ job: { ...job, status: 'completed' } }))
        })

        fetchStub.withArgs(sinon.match({
          url: 'https://s3.com/upload/path',
        })).resolves({
          status: 200,
          ok: true,
          text: () => Promise.resolve('')
        })
      })

    success
      .stdout()
      .it('should display success message when the theme is updated successfully', async ctx => {
        await UpdateCommand.run([baseThemePath, '--themeId', '1234'])
        expect(ctx.stdout).to.contain('Theme updated successfully')
      })

    success
      .stdout()
      .it('should return an object containing the theme ID when ran with --json', async ctx => {
        await UpdateCommand.run([baseThemePath, '--themeId', '1234', '--json'])
        expect(ctx.stdout).to.equal(JSON.stringify({ themeId: '1234' }, null, 2) + '\n')
      })
  })

  describe('update failure', () => {
    test
      .stderr()
      .env(env)
      .do(() => {
        fetchStub.withArgs(sinon.match({
          url: 'https://z3ntest.zendesk.com/api/v2/guide/theming/jobs/themes/updates',
        })).resolves({
          status: 400,
          ok: false,
          text: () => Promise.resolve(JSON.stringify({
            errors: [{
              code: 'TooManyThemes',
              title: 'Maximum number of allowed themes reached'
            }]
          }))
        })
      })
      .it('should report errors when creating the update job fails', async (ctx) => {
        try {
          await UpdateCommand.run([baseThemePath, '--themeId', '1234'])
        } catch (error) {
          expect(ctx.stderr).to.contain('!')
          expect(error.message).to.contain('TooManyThemes')
          expect(error.message).to.contain('Maximum number of allowed themes reached')
        }
      })

    test
      .env(env)
      .do(() => {
        fetchStub.withArgs(sinon.match({
          url: 'https://z3ntest.zendesk.com/api/v2/guide/theming/jobs/themes/updates',
        })).resolves({
          status: 202,
          ok: true,
          text: () => Promise.resolve(JSON.stringify({ job }))
        })

        fetchStub.withArgs(sinon.match({
          url: 'https://z3ntest.zendesk.com/api/v2/guide/theming/jobs/9999',
        })).resolves({
          status: 200,
          ok: true,
          text: () => Promise.resolve(JSON.stringify({
            job: {
              ...job,
              status: 'failed',
              data: null,
              errors: [
                {
                  message: 'Template(s) with syntax error(s)',
                  code: 'InvalidTemplates',
                  meta: {
                    'templates/new_request_page.hbs': [
                      {
                        description: "'request_fosrm' does not exist",
                        line: 22,
                        column: 6,
                        length: 10
                      }
                    ]
                  }
                }
              ]
            }
          }))
        })

        fetchStub.withArgs(sinon.match({
          url: 'https://s3.com/upload/path',
        })).resolves({
          status: 200,
          ok: true,
          text: () => Promise.resolve('')
        })
      })
      .it('should report validation errors', async (ctx) => {
        try {
          await UpdateCommand.run([baseThemePath, '--themeId', '1111'])
        } catch (error) {
          expect(error.message).to.contain('InvalidTemplates')
          expect(error.message).to.contain('Template(s) with syntax error(s)')
          expect(error.message).to.contain('Validation error')
          expect(error.message).to.contain("'request_fosrm' does not exist")
        }
      })
  })
})
