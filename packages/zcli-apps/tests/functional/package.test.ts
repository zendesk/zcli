import { expect, test } from '@oclif/test'
import * as path from 'path'
import * as fs from 'fs'
import * as readline from 'readline'
import * as AdmZip from 'adm-zip'

describe('package', function () {
  const appPath = path.join(__dirname, 'mocks/single_product_app')
  test
    .env({
      ZENDESK_SUBDOMAIN: 'z3ntest',
      ZENDESK_EMAIL: 'admin@z3ntest.com',
      ZENDESK_PASSWORD: '123456' // the universal password
    })
    .nock('https://z3ntest.zendesk.com', api => {
      api
        .post('/api/v2/apps/validate')
        .reply(200)
    })
    .stdout()
    .command(['apps:package', appPath])
    .it('should display success message if package is created', ctx => {
      const pkgPath = path.join(path.relative(process.cwd(), appPath), 'tmp', 'app')
      expect(ctx.stdout).to.contain(`Package created at ${pkgPath}`)
    })

  test
    .env({
      ZENDESK_SUBDOMAIN: 'z3ntest',
      ZENDESK_EMAIL: 'admin@z3ntest.com',
      ZENDESK_PASSWORD: '123456' // the universal password
    })
    .nock('https://z3ntest.zendesk.com', api => {
      api
        .post('/api/v2/apps/validate')
        .reply(400, { description: 'invalid location' })
    })
    .command(['apps:package', path.join(__dirname, 'mocks/single_product_app')])
    .catch(err => expect(err.message).to.contain('Error: invalid location'))
    .it('should display error message if package fails to create')
})

describe('zcliignore', function () {
  const appPath = path.join(__dirname, 'mocks/single_product_ignore')
  const tmpPath = path.join(appPath, 'tmp')

  const file = readline.createInterface({
    input: fs.createReadStream(path.join(appPath, '.zcliignore')),
    output: process.stdout,
    terminal: false
  })

  const ignoreArr: string[] = [] // array that holds each line of the .ignore file

  file.on('line', (line) => {
    ignoreArr.push(line) // add to array dynamically
  })

  after(async () => {
    fs.readdir(tmpPath, (err, files) => {
      if (err) throw err

      for (const file of files) {
        fs.unlink(path.join(tmpPath, file), (err) => {
          if (err) throw err
        })
      }
    })
  })

  test
    .env({
      ZENDESK_SUBDOMAIN: 'z3ntest',
      ZENDESK_EMAIL: 'admin@z3ntest.com',
      ZENDESK_PASSWORD: '123456' // the universal password
    })
    .nock('https://z3ntest.zendesk.com', api => {
      api
        .post('/api/v2/apps/validate')
        .reply(200)
    })
    .stdout()
    .command(['apps:package', appPath])
    .it('should not include certain files as specified in .zcliignore', async () => {
      const packagePath = path.join(tmpPath, fs.readdirSync(tmpPath).find(fn => fn.startsWith('app')) || '')
      const zip = new AdmZip(packagePath)
      for (const zipEntry of zip.getEntries()) {
        expect(ignoreArr.includes(zipEntry.name)).to.eq(false)
      }
    })
})
