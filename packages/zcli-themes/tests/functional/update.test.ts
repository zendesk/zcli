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

  let fetchStub: any = null;
  const sandbox = sinon.createSandbox()

  describe('successful update', () => {
    beforeEach(() => {
      fetchStub = sandbox.stub(global, 'fetch')
    })

    afterEach(() => {
      sandbox.restore()
    })

    const success = test
      .env(env)
      .do(() => {
        fetchStub.withArgs('https://z3ntest.zendesk.com/api/v2/guide/theming/jobs/themes/updates', {
          method: 'POST',
          headers: sinon.match.any,
          body: sinon.match.any
        })
          .resolves({
            ok: true,
            json: () => Promise.resolve({ job })
          } as any)

        fetchStub.withArgs('https://z3ntest.zendesk.com/api/v2/guide/theming/jobs/9999', sinon.match.any)
          .resolves({
            ok: true,
            json: () => Promise.resolve({ job: { ...job, status: 'completed' } })
          } as any)

        fetchStub.withArgs('https://s3.com/upload/path', {
          method: 'POST',
          headers: sinon.match.any,
          body: sinon.match.any
        })
          .resolves({
            ok: true,
            text: () => Promise.resolve('')
          } as any)
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
    beforeEach(() => {
      fetchStub = sandbox.stub(global, 'fetch')
    })

    afterEach(() => {
      sandbox.restore()
    })

    test
      .stderr()
      .env(env)
      .do(() => {
        fetchStub.withArgs('https://z3ntest.zendesk.com/api/v2/guide/theming/jobs/themes/updates', {
          method: 'POST',
          headers: sinon.match.any,
          body: sinon.match.any
        })
          .resolves({
            ok: false,
            status: 400,
            json: () => Promise.resolve({
              errors: [{
                code: 'TooManyThemes',
                title: 'Maximum number of allowed themes reached'
              }]
            })
          } as any)
      })
      .it('should report errors when creating the update job fails', async (ctx) => {
        try {
          await UpdateCommand.run([baseThemePath, '--themeId', '1234'])
        } catch (error) {
          console.log('error', error.message)
          expect(ctx.stderr).to.contain('!')
          expect(error.message).to.contain('TooManyThemes')
          expect(error.message).to.contain('Maximum number of allowed themes reached')
        }
      })

    // test
    //   .env(env)
    //   .do(() => {
    //     fetchStub.withArgs('https://z3ntest.zendesk.com/api/v2/guide/theming/jobs/themes/updates', {
    //       method: 'POST',
    //       headers: sinon.match.any,
    //       body: sinon.match.any
    //     })
    //       .resolves({
    //         ok: true,
    //         status: 202,
    //         json: () => Promise.resolve({ job })
    //       } as any)

    //     fetchStub.withArgs('https://z3ntest.zendesk.com/api/v2/guide/theming/jobs/9999', sinon.match.any)
    //       .resolves({
    //         ok: true,
    //         status: 200,
    //         json: () => Promise.resolve({
    //           job: {
    //             ...job,
    //             status: 'failed',
    //             data: null,
    //             errors: [
    //               {
    //                 message: 'Template(s) with syntax error(s)',
    //                 code: 'InvalidTemplates',
    //                 meta: {
    //                   'templates/new_request_page.hbs': [
    //                     {
    //                       description: "'request_fosrm' does not exist",
    //                       line: 22,
    //                       column: 6,
    //                       length: 10
    //                     }
    //                   ]
    //                 }
    //               }
    //             ]
    //           }
    //         })
    //       } as any)

    //     fetchStub.withArgs('https://s3.com/upload/path', {
    //       method: 'POST',
    //       headers: sinon.match.any,
    //       body: sinon.match.any
    //     })
    //       .resolves({
    //         ok: true,
    //         status: 200,
    //         text: () => Promise.resolve('')
    //       } as any)
    //   })
    //   .it('should report validation errors', async (ctx) => {
    //     try {
    //       await UpdateCommand.run([baseThemePath, '--themeId', '1111'])
    //     } catch (error) {
    //       expect(error.message).to.contain('InvalidTemplates')
    //       expect(error.message).to.contain('Template(s) with syntax error(s)')
    //       expect(error.message).to.contain('Validation error')
    //       expect(error.message).to.contain("'request_fosrm' does not exist")
    //     }
    //   })
  })
})
