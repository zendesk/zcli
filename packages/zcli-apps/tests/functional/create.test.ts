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

  afterEach(() => {
    uploadAppPkgStub.reset()
    createAppPkgStub.reset()
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
            .post('/api/support/apps/installations.json', { app_id: '123456', settings: { name: 'Test App 1' } })
            .reply(200)
          api
            .post('/api/support/apps/installations.json', { app_id: '123458', settings: { name: 'Test App 2', salesForceId: 123 } })
            .reply(200)
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
        .stub(requestUtils, 'getSubdomain', () => Promise.resolve(undefined))
        .stub(requestUtils, 'getDomain', () => Promise.resolve(undefined))
        .env(env)
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
            .post('/api/support/apps/installations.json', { app_id: '123456', settings: { name: 'Test App 1' } })
            .reply(200)
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
        })
        .nock('https://z3ntest.zendesk.com/', api => {
          api
            .post('/api/apps.json', { upload_id: 819, name: 'Test App 1' })
            .reply(200, { job_id: 129 })
          api
            .get('/api/v2/apps/job_statuses/129')
            .reply(200, { status: 'completed', message: 'awesome', app_id: 123456 })
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
        })
        .nock('https://z3ntest.zendesk.com/', api => {
          api
            .put('/api/v2/apps/123456', { upload_id: 819 })
            .reply(200, { job_id: 129 })
          api
            .get('/api/v2/apps/job_statuses/129')
            .reply(200, { status: 'completed', message: 'awesome', app_id: 123456 })
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
        })
        .nock('https://z3ntest.zendesk.com/', api => {
          api
            .put('/api/v2/apps/123456', { upload_id: 819 })
            .reply(200, { job_id: 129 })
          api
            .get('/api/v2/apps/job_statuses/129')
            .reply(200, { status: 'completed', message: 'awesome', app_id: 123456 })
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
        .env({...env, ZENDESK_APP_ID: '666'})
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
            .reply(200, { status: 'completed', message: 'awesome', app_id: 123456 })
        })
        .stdout()
        .command(['apps:update', singleProductApp])
        .it('should update said apps', async ctx => {
          expect(ctx.stdout).to.contain(successUpdateMessage)
        })
    })
  })
})
