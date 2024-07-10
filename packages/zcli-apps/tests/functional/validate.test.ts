import { expect, test } from '@oclif/test'
import * as path from 'path'
import env from './env'
import * as requestUtils from '../../../zcli-core/src/lib/requestUtils'

describe('validate', function () {
  test
    .stub(requestUtils, 'getSubdomain', () => Promise.resolve(undefined))
    .stub(requestUtils, 'getDomain', () => Promise.resolve(undefined))
    .env(env)
    .nock('https://z3ntest.zendesk.com', api => {
      api
        .post('/api/v2/apps/validate')
        .reply(200)
    })
    .stdout()
    .command(['apps:validate', path.join(__dirname, 'mocks/single_product_app')])
    .it('should display success message when no errors', ctx => {
      expect(ctx.stdout).to.equal('No validation errors\n')
    })

  test
    .stub(requestUtils, 'getSubdomain', () => Promise.resolve(undefined))
    .stub(requestUtils, 'getDomain', () => Promise.resolve(undefined))
    .env(env)
    .nock('https://z3ntest.zendesk.com', api => {
      api
        .post('/api/v2/apps/validate')
        .reply(400, { description: 'invalid location' })
    })
    .stdout()
    .command(['apps:validate', path.join(__dirname, 'mocks/single_product_app')])
    .catch(err => expect(err.message).to.contain('Error: invalid location'))
    .it('should display error message if validation fails')
})
