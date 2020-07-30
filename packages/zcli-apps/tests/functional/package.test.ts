import { expect, test } from '@oclif/test'
import * as path from 'path'

describe('package', function () {
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
    .command(['apps:package', path.join(__dirname, 'mocks/single_product_app')])
    .it('should display success message package is created', ctx => {
      expect(ctx.stdout).to.contain('Package created at packages/zcli-apps/tests/functional/mocks/single_product_app/tmp/app')
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
