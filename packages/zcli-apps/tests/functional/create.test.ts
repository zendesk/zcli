import { expect, test } from '@oclif/test'
import * as path from 'path'
import * as sinon from 'sinon'
import cli from 'cli-ux'
import * as createAppUtils from '../../src/utils/createApp'
import * as appConfig from '../../src/utils/appConfig'
import * as requestUtils from '../../../zcli-core/src/lib/requestUtils'
import * as packageUtil from '../../src/lib/package'

describe('apps create', function () {
  const promptStub = sinon.stub()
  const singleProductApp = path.join(__dirname, 'mocks/single_product_app')
  const multiProductApp = path.join(__dirname, 'mocks/multi_product_app')
  const successMessage = 'Successfully installed app'
  const uploadAppPkgStub = sinon.stub(createAppUtils, 'uploadAppPkg')
  const createAppPkgStub = sinon.stub()

  afterEach(() => {
    uploadAppPkgStub.reset()
    createAppPkgStub.reset()
  })

  describe('with multiple apps', () => {
    test
      .stub(cli, 'prompt', () => promptStub)
      .stub(packageUtil, 'createAppPkg', () => createAppPkgStub)
      .stub(createAppUtils, 'getManifestAppName', () => 'importantAppName')
      .stub(requestUtils, 'getSubdomain', () => Promise.resolve('z3ntest'))
      .stub(appConfig, 'setConfig', () => Promise.resolve())
      .env({
        ZENDESK_SUBDOMAIN: 'z3ntest',
        ZENDESK_EMAIL: 'admin@z3ntest.com',
        ZENDESK_PASSWORD: '123456' // the universal password
      })
      .do(() => {
        promptStub.onFirstCall().resolves('salesForcePowersActivate!')
        createAppPkgStub.onFirstCall().resolves('thePathLessFrequentlyTravelled')
        uploadAppPkgStub.onFirstCall().resolves({ id: 817 })
        uploadAppPkgStub.onSecondCall().resolves({ id: 818 })
      })
      .nock('https://z3ntest.zendesk.com/', api => {
        api
          .post('/api/apps.json', { upload_id: 817, name: 'Test App 1' })
          .reply(200, { job_id: 127 })
        api
          .post('/api/apps.json', { upload_id: 818, name: 'Test App 2' })
          .reply(200, { job_id: 128 })
        api
          .get('/api/v2/apps/job_statuses/127')
          .reply(200, { status: 'completed', message: 'awesome', app_id: 123456 })
        api
          .get('/api/v2/apps/job_statuses/128')
          .reply(200, { status: 'completed', message: 'awesome', app_id: 123458 })
        api
          .post('/api/v2/apps/installations.json', { app_id: '123456', settings: { name: 'Test App 1' } })
          .reply(200)
        api
          .post('/api/v2/apps/installations.json', { app_id: '123458', settings: { name: 'Test App 2', salesForceId: 'salesForcePowersActivate!' } })
          .reply(200)
      })
      .stdout()
      .command(['apps:create', singleProductApp, multiProductApp])
      // TODO: use fake timers
      .timeout(5000)
      .it('should create said apps', async ctx => {
        expect(ctx.stdout).to.contain(successMessage)
      })
  })

  describe('with single app', () => {
    test
      .stub(packageUtil, 'createAppPkg', () => createAppPkgStub)
      .env({
        ZENDESK_SUBDOMAIN: 'z3ntest',
        ZENDESK_EMAIL: 'admin@z3ntest.com',
        ZENDESK_PASSWORD: '123456' // the universal password
      })
      .do(() => {
        createAppPkgStub.onFirstCall().resolves('thePathLessFrequentlyTravelled')
        uploadAppPkgStub.onFirstCall().resolves({ id: 819 })
      })
      .nock('https://z3ntest.zendesk.com/', api => {
        api
          .post('/api/apps.json', { upload_id: 819, name: 'Test App 1' })
          .reply(200, { job_id: 129 })
        api
          .get('/api/v2/apps/job_statuses/129')
          .reply(200, { status: 'completed', message: 'awesome', app_id: 123456 })
        api
          .post('/api/v2/apps/installations.json', { app_id: '123456', settings: { name: 'Test App 1' } })
          .reply(200)
      })
      .stdout()
      .command(['apps:create', singleProductApp])
      // TODO: use fake timers
      .timeout(5000)
      .it('should create said apps', async ctx => {
        expect(ctx.stdout).to.contain(successMessage)
      })
  })
})
