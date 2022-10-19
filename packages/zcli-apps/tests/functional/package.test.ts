import { expect, test } from '@oclif/test'
import * as path from 'path'
import { dirname } from 'path'

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
  console.log(dirname)
  console.log(appPath)
  const fs = require('fs');
  var jsZip = require('jszip')
  const packagePath = path.join(appPath, "tmp")
  const readline = require('readline');

  const file = readline.createInterface({
    input: fs.createReadStream(path.join(appPath, '.zcliignore')),
    output: process.stdout,
    terminal: false
  })
  
  const ignoreArr: string[] = [] //array that holds each line of the .ignore file

  file.on('line', (line) => {
    console.log(line)
    ignoreArr.push(line) //add to array dynamically
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
    .it('should not include certain files as specified in .zcliignore', ctx => {
      const pkgPath = path.join(path.relative(process.cwd(), appPath), 'tmp', 'app')
      fs.readFile(appPath, function (err, data) {
        if (!err) {
          var zip = new jsZip()
          zip.loadAsync(data).then(function (contents) {
            Object.keys(contents.files).forEach(function (filename) {
              console.log(filename)
              expect(!(ignoreArr.includes(filename)))
          })
        })
        }
      })
    })
})


