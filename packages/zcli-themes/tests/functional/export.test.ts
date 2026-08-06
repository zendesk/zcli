import type { ExportJob } from '../../../zcli-themes/src/types'
import { expect, test } from '@oclif/test'
import * as sinon from 'sinon'
import * as fs from 'fs'
import * as path from 'path'
import ExportCommand from '../../src/commands/themes/export'
import env from './env'
import { CLIError } from '@oclif/core/lib/errors'

describe('themes:export', function () {
  const downloadUrl = 'https://s3.com/download/theme.zip'
  const job: ExportJob = {
    id: '9999',
    status: 'pending',
    data: {
      theme_id: '1234',
      upload: {
        url: 'https://s3.com/upload/path',
        parameters: {}
      },
      download: {
        url: downloadUrl
      }
    }
  }

  let fetchStub: sinon.SinonStub
  let writeFileStub: sinon.SinonStub

  beforeEach(() => {
    fetchStub = sinon.stub(global, 'fetch')
    writeFileStub = sinon.stub(fs, 'writeFileSync')
  })

  afterEach(() => {
    fetchStub.restore()
    writeFileStub.restore()
  })

  describe('successful export', () => {
    const success = test
      .env(env)
      .do(() => {
        fetchStub.withArgs(sinon.match({
          url: 'https://z3ntest.zendesk.com/api/v2/guide/theming/jobs/themes/exports',
          method: 'POST'
        })).resolves({
          status: 202,
          ok: true,
          text: () => Promise.resolve(JSON.stringify({ job }))
        })

        // The completed poll response carries `data: null`; the download URL
        // must come from the job returned at creation time.
        fetchStub.withArgs(sinon.match({
          url: 'https://z3ntest.zendesk.com/api/v2/guide/theming/jobs/9999',
          method: 'GET'
        })).resolves({
          status: 200,
          ok: true,
          text: () => Promise.resolve(JSON.stringify({
            job: {
              id: job.id,
              status: 'completed',
              errors: null,
              data: null
            }
          }))
        })

        fetchStub.withArgs(sinon.match({
          url: downloadUrl,
          method: 'GET'
        })).resolves({
          status: 200,
          ok: true,
          headers: new Headers(),
          arrayBuffer: () => Promise.resolve(new TextEncoder().encode('theme-zip-bytes').buffer)
        })
      })

    success
      .stdout()
      .it('should display success message when the theme is exported successfully', async ctx => {
        await ExportCommand.run(['--themeId', '1234'])
        expect(ctx.stdout).to.contain('Theme exported successfully theme ID: 1234')
      })

    success
      .stdout()
      .it('should return an object containing the theme ID and path when ran with --json', async ctx => {
        await ExportCommand.run(['--themeId', '1234', '--json'])
        const output = JSON.parse(ctx.stdout)
        expect(output.themeId).to.equal('1234')
        expect(output.path).to.contain('theme_1234.zip')
        expect(writeFileStub.calledOnce).to.equal(true)
      })

    success
      .stdout()
      .it('should write the theme to the provided theme directory', async ctx => {
        await ExportCommand.run(['./exports', '--themeId', '1234', '--json'])
        const output = JSON.parse(ctx.stdout)
        expect(output.path).to.equal(path.join(process.cwd(), 'exports', 'theme_1234.zip'))
      })
  })

  describe('export failure', () => {
    test
      .stderr()
      .env(env)
      .do(() => {
        fetchStub.withArgs(sinon.match({
          url: 'https://z3ntest.zendesk.com/api/v2/guide/theming/jobs/themes/exports',
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
      .it('should report errors when creating the export job fails', async (ctx) => {
        try {
          await ExportCommand.run(['--themeId', '1234'])
          throw new Error('Should have thrown an error')
        } catch (error) {
          if (error instanceof Error && error.message === 'Should have thrown an error') {
            throw error
          }
          expect(ctx.stderr).to.contain('!')
          expect((error as CLIError).message).to.contain('ThemeNotFound')
          expect((error as CLIError).message).to.contain('Invalid id')
        }
      })

    test
      .env(env)
      .do(() => {
        fetchStub.withArgs(sinon.match({
          url: 'https://z3ntest.zendesk.com/api/v2/guide/theming/jobs/themes/exports',
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
                  message: 'Something went wrong',
                  code: 'ExportFailed',
                  meta: {}
                }
              ]
            }
          }))
        })
      })
      .it('should report errors when the export job fails', async () => {
        try {
          await ExportCommand.run(['--themeId', '1234'])
          throw new Error('Should have thrown an error')
        } catch (error) {
          if (error instanceof Error && error.message === 'Should have thrown an error') {
            throw error
          }
          expect((error as CLIError).message).to.contain('ExportFailed')
          expect((error as CLIError).message).to.contain('Something went wrong')
        }
      })
  })
})
