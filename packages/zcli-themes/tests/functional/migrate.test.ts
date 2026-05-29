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
  let styleBackup: string
  let scriptBackup: string
  const migratedAssetPath = path.join(baseThemePath, 'assets/category_tree.js')
  const partialsDir = path.join(baseThemePath, 'templates/partials')

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
    styleBackup = fs.readFileSync(path.join(baseThemePath, 'style.css'), 'utf8')
    scriptBackup = fs.readFileSync(path.join(baseThemePath, 'script.js'), 'utf8')
  })

  afterEach(() => {
    fetchStub.restore()
    // Restore original files
    fs.writeFileSync(path.join(baseThemePath, 'manifest.json'), manifestBackup)
    fs.writeFileSync(
      path.join(baseThemePath, 'templates/document_head.hbs'),
      templateBackup
    )
    fs.writeFileSync(path.join(baseThemePath, 'style.css'), styleBackup)
    fs.writeFileSync(path.join(baseThemePath, 'script.js'), scriptBackup)
    // Clean up migrated asset
    if (fs.existsSync(migratedAssetPath)) {
      fs.unlinkSync(migratedAssetPath)
    }
    // Clean up partials/ directory created by the migration
    if (fs.existsSync(partialsDir)) {
      fs.rmSync(partialsDir, { recursive: true, force: true })
    }
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
                  api_version: 3
                },
                templates: {
                  document_head: '{{!chat (obsolete)}}',
                  'partials/user_info': '<div>{{user.name}}</div>',
                  css: '/* migrated */\nbody {}',
                  js: '/* migrated */\nconsole.log("hi")'
                },
                assets: {
                  'category_tree.js': Buffer.from('console.log("category_tree");\n').toString('base64')
                },
                migration_report: {
                  document_head: [
                    {
                      target: 'chat',
                      strategy: 'inline',
                      description: 'The `chat` helper is no longer rendered.',
                      test_plan: 'Confirm no chat-related markup is rendered.'
                    }
                  ]
                }
              })
            )
        })
    })

    success
      .stdout()
      .it('should migrate theme successfully and update files', async (ctx) => {
        await MigrateCommand.run([baseThemePath])

        const manifest = JSON.parse(
          fs.readFileSync(path.join(baseThemePath, 'manifest.json'), 'utf8')
        )
        expect(manifest.api_version).to.equal(3)

        // Verify template was updated
        const template = fs.readFileSync(
          path.join(baseThemePath, 'templates/document_head.hbs'),
          'utf8'
        )
        expect(template).to.contain('{{!chat (obsolete)}}')

        // Verify partial was written under templates/partials/
        const partial = fs.readFileSync(
          path.join(baseThemePath, 'templates/partials/user_info.hbs'),
          'utf8'
        )
        expect(partial).to.contain('{{user.name}}')

        // Verify asset was written
        const asset = fs.readFileSync(migratedAssetPath, 'utf8')
        expect(asset).to.equal('console.log("category_tree");\n')

        // Verify root style.css and script.js were rewritten
        const style = fs.readFileSync(path.join(baseThemePath, 'style.css'), 'utf8')
        expect(style).to.equal('/* migrated */\nbody {}')
        const script = fs.readFileSync(path.join(baseThemePath, 'script.js'), 'utf8')
        expect(script).to.equal('/* migrated */\nconsole.log("hi")')

        // Verify migration report was printed
        expect(ctx.stdout).to.contain('Theme migrated successfully')
        expect(ctx.stdout).to.contain('document_head')
        expect(ctx.stdout).to.contain('chat')
        expect(ctx.stdout).to.contain('Confirm no chat-related markup is rendered.')
      })
  })

  describe('migration with internal server error', () => {
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
            status: 500,
            ok: false,
            text: () =>
              Promise.resolve(
                JSON.stringify({
                  general_error: 'Failed to migrate the theme.'
                })
              )
          })
      })
      .it('should print a short failure message and a plain issues URL', async () => {
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
          const message = (error as CLIError).message
          expect(message).to.contain('Failed to migrate the theme')
          expect(message).to.contain('https://github.com/zendesk/zcli/issues/new')
          expect(message).to.not.contain('themes-migrate')
        }
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
