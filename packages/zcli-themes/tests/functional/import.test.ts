import type { Job } from '../../../zcli-themes/src/types'
import { expect, test } from '@oclif/test'
import * as sinon from 'sinon'
import * as path from 'path'
import * as nock from 'nock'
import ImportCommand from '../../src/commands/themes/import'
import env from './env'


describe('themes:import', function () {
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

  describe('successful import', () => {
    const success = test
      .env(env)
      .do(() => {
        fetchStub.withArgs(sinon.match({
          url: 'https://z3ntest.zendesk.com/api/v2/guide/theming/jobs/themes/imports',
          method: 'POST'
        })).resolves({
          status: 202,
          ok: true,
          text: () => Promise.resolve(JSON.stringify({ job }))
        })

        fetchStub.withArgs(sinon.match({
          url: 'https://z3ntest.zendesk.com/api/v2/guide/theming/jobs/9999',
          method: 'GET'
        })).resolves({
          status: 200,
          ok: true,
          text: () => Promise.resolve(JSON.stringify({ job: { ...job, status: 'completed' } }))
        })

        fetchStub.withArgs(sinon.match({
          url: 'https://s3.com/upload/path',
          method: 'POST'
        })).resolves({
          status: 200,
          ok: true,
          text: () => Promise.resolve('')
        })
      })

    success
      .stdout()
      .it('should display success message when the theme is imported successfully', async ctx => {
        await ImportCommand.run([baseThemePath, '--brandId', '1111'])
        expect(ctx.stdout).to.contain('Theme imported successfully theme ID: 1234')
      })

    success
      .stdout()
      .it('should return an object containing the theme ID when ran with --json', async ctx => {
        await ImportCommand.run([baseThemePath, '--brandId', '1111', '--json'])
        expect(ctx.stdout).to.equal(JSON.stringify({ themeId: '1234' }, null, 2) + '\n')
      })
  })

  describe('import failure', () => {
    test
      .stderr()
      .env(env)
      .do(() => {
        fetchStub.withArgs(sinon.match({
          url: 'https://z3ntest.zendesk.com/api/v2/guide/theming/jobs/themes/imports',
          method: 'POST'
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
      .it('should report errors when creating the import job fails', async (ctx) => {
        try {
          await ImportCommand.run([baseThemePath, '--brandId', '1111'])
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
          url: 'https://z3ntest.zendesk.com/api/v2/guide/theming/jobs/themes/imports',
          method: 'POST'
        })).resolves({
          status: 202,
          ok: true,
          text: () => Promise.resolve(JSON.stringify({ job }))
        })

        fetchStub.withArgs(sinon.match({
          url: 'https://z3ntest.zendesk.com/api/v2/guide/theming/jobs/9999',
          method: 'GET'
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
                        description: "'post_form' does not exist",
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
          method: 'POST'
        })).resolves({
          status: 200,
          ok: true,
          text: () => Promise.resolve('')
        })
      })
      .it('should report validation errors', async () => {
        try {
          await ImportCommand.run([baseThemePath, '--brandId', '1111'])
        } catch (error) {
          expect(error.message).to.contain('InvalidTemplates')
          expect(error.message).to.contain('Template(s) with syntax error(s)')
          expect(error.message).to.contain('Validation error')
          expect(error.message).to.contain("'post_form' does not exist")
        }
      })
  })
})
