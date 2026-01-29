import { expect, test } from '@oclif/test'
import MigrateCommand from '../../src/commands/themes/migrate'
import env from './env'
import * as sinon from 'sinon'
import * as path from 'path'
import * as fs from 'fs'
import { CLIError } from '@oclif/core/lib/errors'

describe('themes:migrate', function () {
  const baseThemePath = path.join(__dirname, 'mocks/base_theme')
  let fetchStub: sinon.SinonStub
  let manifestBackup: string
  let templateBackup: string

  beforeEach(() => {
    fetchStub = sinon.stub(global, 'fetch')
    // Backup original files
    manifestBackup = fs.readFileSync(
      path.join(baseThemePath, 'manifest.json'),
      'utf8'
    )
    templateBackup = fs.readFileSync(
      path.join(baseThemePath, 'templates/document_head.hbs'),
      'utf8'
    )
  })

  afterEach(() => {
    fetchStub.restore()
    // Restore original files
    fs.writeFileSync(path.join(baseThemePath, 'manifest.json'), manifestBackup)
    fs.writeFileSync(
      path.join(baseThemePath, 'templates/document_head.hbs'),
      templateBackup
    )
  })

  describe('successful migration', () => {
    const success = test.env(env).do(() => {
      fetchStub
        .withArgs(
          sinon.match({
            url: 'https://z3ntest.zendesk.com/hc/api/internal/theming/migrations',
            method: 'POST'
          })
        )
        .resolves({
          status: 200,
          ok: true,
          text: () =>
            Promise.resolve(
              JSON.stringify({
                metadata: {
                  api_version: 2
                },
                templates: {
                  document_head: '{{!chat (obsolete)}}'
                }
              })
            )
        })
    })

    success
      .stdout()
      .it('should migrate theme successfully and update files', async () => {
        await MigrateCommand.run([baseThemePath])

        const manifest = JSON.parse(
          fs.readFileSync(path.join(baseThemePath, 'manifest.json'), 'utf8')
        )
        expect(manifest.api_version).to.equal(2)

        // Verify template was updated
        const template = fs.readFileSync(
          path.join(baseThemePath, 'templates/document_head.hbs'),
          'utf8'
        )
        expect(template).to.contain('{{!chat (obsolete)}}')
      })
  })

  describe('migration with template errors', () => {
    test
      .env(env)
      .stderr()
      .do(() => {
        fetchStub
          .withArgs(
            sinon.match({
              url: 'https://z3ntest.zendesk.com/hc/api/internal/theming/migrations',
              method: 'POST'
            })
          )
          .resolves({
            status: 400,
            ok: false,
            text: () =>
              Promise.resolve(
                JSON.stringify({
                  template_errors: {
                    document_head: [
                      {
                        description: "'articles' does not exist",
                        line: 10,
                        column: 6,
                        length: 7
                      }
                    ]
                  }
                })
              )
          })
      })
      .it('should report template validation errors', async (ctx) => {
        try {
          await MigrateCommand.run([baseThemePath])
          throw new Error('Should have thrown an error')
        } catch (error) {
          if (
            error instanceof Error &&
            error.message === 'Should have thrown an error'
          ) {
            throw error
          }
          expect(ctx.stderr).to.contain('!')
          expect((error as CLIError).oclif.exit).to.equal(2)
        }
      })
  })

  describe('migration with general error', () => {
    test
      .env(env)
      .stderr()
      .do(() => {
        fetchStub
          .withArgs(
            sinon.match({
              url: 'https://z3ntest.zendesk.com/hc/api/internal/theming/migrations',
              method: 'POST'
            })
          )
          .resolves({
            status: 400,
            ok: false,
            text: () =>
              Promise.resolve(
                JSON.stringify({
                  general_error: 'Theme migration failed'
                })
              )
          })
      })
      .it('should report general errors', async (ctx) => {
        try {
          await MigrateCommand.run([baseThemePath])
          throw new Error('Should have thrown an error')
        } catch (error) {
          if (
            error instanceof Error &&
            error.message === 'Should have thrown an error'
          ) {
            throw error
          }
          expect(ctx.stderr).to.contain('!')
          expect((error as CLIError).oclif.exit).to.equal(2)
        }
      })
  })
})
