import { expect, test } from '@oclif/test'
import * as path from 'path'
import * as sinon from 'sinon'
import env from './env'
import * as requestUtils from '../../../zcli-core/src/lib/requestUtils'

describe('validate', function () {
  let fetchStub: sinon.SinonStub

  beforeEach(() => {
    fetchStub = sinon.stub(global, 'fetch')
  })

  afterEach(() => {
    fetchStub.restore()
  })

  test
    .stub(requestUtils, 'getSubdomain', () => Promise.resolve(undefined))
    .stub(requestUtils, 'getDomain', () => Promise.resolve(undefined))
    .env(env)
    .do(() => {
      fetchStub.withArgs(sinon.match({
        url: 'https://z3ntest.zendesk.com/api/v2/apps/validate'
      })).resolves({
        status: 200,
        ok: true,
        text: () => Promise.resolve('')
      })
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
    .do(() => {
      fetchStub.withArgs(sinon.match({
        url: 'https://z3ntest.zendesk.com/api/v2/apps/validate'
      })).resolves({
        status: 400,
        ok: false,
        text: () => Promise.resolve(JSON.stringify({ description: 'invalid location' }))
      })
    })
    .stdout()
    .command(['apps:validate', path.join(__dirname, 'mocks/single_product_app')])
    .catch(err => expect(err.message).to.contain('Error: invalid location'))
    .it('should display error message if validation fails')
})
