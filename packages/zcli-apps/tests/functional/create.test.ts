import { expect, test } from '@oclif/test'
import * as path from 'path'
import * as sinon from 'sinon'
import * as createAppUtils from '../../src/utils/createApp'
import * as appConfig from '../../src/utils/appConfig'
import * as requestUtils from '../../../zcli-core/src/lib/requestUtils'
import * as packageUtil from '../../src/lib/package'
import env from './env'

describe('apps', function () {
  const singleProductApp = path.join(__dirname, 'mocks/single_product_app')
  const multiProductApp = path.join(__dirname, 'mocks/multi_product_app')
  const requirementsOnlyApp = path.join(__dirname, 'mocks/requirements_only_app')
  const successCreateMessage = 'Successfully installed app'
  const successUpdateMessage = 'Successfully updated app'
  const uploadAppPkgStub = sinon.stub(createAppUtils, 'uploadAppPkg')
  const createAppPkgStub = sinon.stub()
  let fetchStub: sinon.SinonStub

  beforeEach(() => {
    fetchStub = sinon.stub(global, 'fetch')
  })

  afterEach(() => {
    uploadAppPkgStub.reset()
    createAppPkgStub.reset()
    fetchStub.restore()
  })

  describe('create', () => {
    describe('with multiple apps', () => {
      test
        .stub(packageUtil, 'createAppPkg', () => createAppPkgStub)
        .stub(createAppUtils, 'getManifestAppName', () => 'importantAppName')
        .stub(requestUtils, 'getSubdomain', () => Promise.resolve(undefined))
        .stub(requestUtils, 'getDomain', () => Promise.resolve(undefined))
        .stub(appConfig, 'setConfig', () => Promise.resolve())
        .env(env)
        .do(() => {
          createAppPkgStub.onFirstCall().resolves('thePathLessFrequentlyTravelled')
          uploadAppPkgStub.onFirstCall().resolves({ id: 817 })
          uploadAppPkgStub.onSecondCall().resolves({ id: 818 })

          fetchStub.withArgs(sinon.match({
            url: 'https://z3ntest.zendesk.com/api/apps.json',
          })).onFirstCall().resolves({
            body: JSON.stringify({ job_id: 127 }),
            text: () => Promise.resolve(JSON.stringify({ job_id: 127 })),
            ok: true,
          }).onSecondCall().resolves({
            body: JSON.stringify({ job_id: 128 }),
            text: () => Promise.resolve(JSON.stringify({ job_id: 128 })),
            ok: true,
          })
          fetchStub.withArgs(sinon.match({
            url: 'https://z3ntest.zendesk.com/api/v2/apps/job_statuses/127',
          })).resolves({
            text: () => Promise.resolve(JSON.stringify({ status: 'completed', message: 'awesome', app_id: 123456 })),
            body: JSON.stringify({ status: 'completed', message: 'awesome', app_id: 123456 }),
            ok: true,
          })
          fetchStub.withArgs(sinon.match({
            url: 'https://z3ntest.zendesk.com/api/v2/apps/job_statuses/128',
          })).resolves({
            text: () => Promise.resolve(JSON.stringify({ status: 'completed', message: 'awesome', app_id: 123458 })),
            body: JSON.stringify({ status: 'completed', message: 'awesome', app_id: 123458 }),
            ok: true,
          })
          fetchStub.withArgs(sinon.match({
            url: 'https://z3ntest.zendesk.com/api/support/apps/installations.json',
          })).onFirstCall().resolves({
            text: () => Promise.resolve(JSON.stringify({ job_id: 127 })),
            body: JSON.stringify({ job_id: 127 }),
            ok: true,
          })
          fetchStub.withArgs(sinon.match({
            url: 'https://z3ntest.zendesk.com/api/support/apps/installations.json',
          })).onSecondCall().resolves({
            text: () => Promise.resolve(JSON.stringify({ job_id: 128 })),
            body: JSON.stringify({ job_id: 128 }),
            ok: true,
          })
        })
        .stdout()
        .command(['apps:create', singleProductApp, multiProductApp])
        .it('should create said apps', async ctx => {
          expect(ctx.stdout).to.contain(successCreateMessage)
        })
    })

    describe('with single app', () => {
      test
        .stub(packageUtil, 'createAppPkg', () => createAppPkgStub)
        .stub(createAppUtils, 'getManifestAppName', () => 'importantAppName')
        .stub(requestUtils, 'getSubdomain', () => Promise.resolve(undefined))
        .stub(requestUtils, 'getDomain', () => Promise.resolve(undefined))
        .stub(appConfig, 'setConfig', () => Promise.resolve())
        .env(env)
        .do(() => {
          createAppPkgStub.onFirstCall().resolves('thePathLessFrequentlyTravelled')
          uploadAppPkgStub.onFirstCall().resolves({ id: 819 })

          fetchStub.withArgs(sinon.match({
            url: 'https://z3ntest.zendesk.com/api/apps.json',
          })).resolves({
            body: JSON.stringify({ job_id: 129 }),
            text: () => Promise.resolve(JSON.stringify({ job_id: 129 })),
            ok: true,
          })
          fetchStub.withArgs(sinon.match({
            url: 'https://z3ntest.zendesk.com/api/v2/apps/job_statuses/129',
          })).resolves({
            text: () => Promise.resolve(JSON.stringify({ status: 'completed', message: 'awesome', app_id: 123456 })),
            body: JSON.stringify({ status: 'completed', message: 'awesome', app_id: 123456 }),
            ok: true,
          })
          fetchStub.withArgs(sinon.match({
            url: 'https://z3ntest.zendesk.com/api/support/apps/installations.json',
          })).resolves({
            text: () => Promise.resolve(JSON.stringify({ job_id: 129 })),
            body: JSON.stringify({ job_id: 129 }),
            ok: true,
          })
        })
        .stdout()
        .command(['apps:create', singleProductApp])
        .it('should create said apps', async ctx => {
          expect(ctx.stdout).to.contain(successCreateMessage)
        })
    })

    describe('with requirements-only app', () => {
      test
        .stub(packageUtil, 'createAppPkg', () => createAppPkgStub)
        .env(env)
        .do(() => {
          createAppPkgStub.onFirstCall().resolves('thePathLessFrequentlyTravelled')
          uploadAppPkgStub.onFirstCall().resolves({ id: 819 })

          fetchStub.withArgs(sinon.match({
            url: 'https://z3ntest.zendesk.com/api/apps.json',
          })).resolves({
            body: JSON.stringify({ job_id: 129 }),
            text: () => Promise.resolve(JSON.stringify({ job_id: 129 })),
            ok: true,
          })
          fetchStub.withArgs(sinon.match({
            url: 'https://z3ntest.zendesk.com/api/v2/apps/job_statuses/129',
          })).resolves({
            text: () => Promise.resolve(JSON.stringify({ status: 'completed', message: 'awesome', app_id: 123456 })),
            body: JSON.stringify({ status: 'completed', message: 'awesome', app_id: 123456 }),
            ok: true,
          })
          fetchStub.withArgs(sinon.match({
            url: 'https://z3ntest.zendesk.com/api/support/apps/installations.json',
          })).resolves({
            text: () => Promise.resolve(JSON.stringify({ job_id: 129 })),
            body: JSON.stringify({ job_id: 129 }),
            ok: true,
          })
        })
        .stdout()
        .command(['apps:create', requirementsOnlyApp])
        .it('should create said apps', async ctx => {
          expect(ctx.stdout).to.contain(successCreateMessage)
        })
    })
  })

  describe('update', () => {
    describe('with single app', () => {
      test
        .stub(packageUtil, 'createAppPkg', () => createAppPkgStub)
        .env(env)
        .do(() => {
          createAppPkgStub.onFirstCall().resolves('thePathLessFrequentlyTravelled')
          uploadAppPkgStub.onFirstCall().resolves({ id: 819 })

          fetchStub.withArgs('https://z3ntest.zendesk.com/api/v2/apps/123456').resolves({
            json: () => Promise.resolve({ job_id: 129 }),
            ok: true,
          } as Response)
          fetchStub.withArgs('https://z3ntest.zendesk.com/api/v2/apps/job_statuses/129').resolves({
            json: () => Promise.resolve({ status: 'completed', message: 'awesome', app_id: 123456 }),
            ok: true,
          } as Response)
        })
        .stdout()
        .command(['apps:update', singleProductApp])
        .it('should update said apps', async ctx => {
          expect(ctx.stdout).to.contain(successUpdateMessage)
        })
    })

    describe('with requirements-only app', () => {
      test
        .stub(packageUtil, 'createAppPkg', () => createAppPkgStub)
        .env(env)
        .do(() => {
          createAppPkgStub.onFirstCall().resolves('thePathLessFrequentlyTravelled')
          uploadAppPkgStub.onFirstCall().resolves({ id: 819 })

          fetchStub.withArgs('https://z3ntest.zendesk.com/api/v2/apps/123456').resolves({
            json: () => Promise.resolve({ job_id: 129 }),
            ok: true,
          } as Response)
          fetchStub.withArgs('https://z3ntest.zendesk.com/api/v2/apps/job_statuses/129').resolves({
            json: () => Promise.resolve({ status: 'completed', message: 'awesome', app_id: 123456 }),
            ok: true,
          } as Response)
        })
        .stdout()
        .command(['apps:update', requirementsOnlyApp])
        .it('should update said apps', async ctx => {
          expect(ctx.stdout).to.contain(successUpdateMessage)
        })
    })

    describe('with ZENDESK_APP_ID set', () => {
      test
        .stub(packageUtil, 'createAppPkg', () => createAppPkgStub)
        .env({ ...env, ZENDESK_APP_ID: '666' })
        .do(() => {
          createAppPkgStub.onFirstCall().resolves('thePathLessFrequentlyTravelled')
          uploadAppPkgStub.onFirstCall().resolves({ id: 819 })
        })
        .nock('https://z3ntest.zendesk.com/', api => {
          api
            .put('/api/v2/apps/666', { upload_id: 819 })
            .reply(200, { job_id: 129 })
          api
            .get('/api/v2/apps/job_statuses/129')
            .reply(200, { status: 'completed', message: 'awesome', app_id: 666 })
        })
        .stdout()
        .command(['apps:update', singleProductApp])
        .it('should update said apps', async ctx => {
          expect(ctx.stdout).to.contain(successUpdateMessage)
        })
    })
  })
})
