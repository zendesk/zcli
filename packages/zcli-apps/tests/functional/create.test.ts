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
  const sandbox = sinon.createSandbox()
  let fetchStub: any = null;

  afterEach(() => {
    uploadAppPkgStub.reset()
    createAppPkgStub.reset()
  })

  describe('create', () => {
    beforeEach(() => {
      fetchStub = sandbox.stub(global, 'fetch')
    })

    afterEach(() => {
      sandbox.restore()
    })

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

          // Stub fetch calls
          fetchStub.withArgs('https://z3ntest.zendesk.com/api/apps.json', sinon.match.any)
            .onFirstCall().resolves({
              ok: true,
              json: () => Promise.resolve({ job_id: 127 })
            } as any)
            .onSecondCall().resolves({
              ok: true,
              json: () => Promise.resolve({ job_id: 128 })
            } as any)

          fetchStub.withArgs('https://z3ntest.zendesk.com/api/v2/apps/job_statuses/127', sinon.match.any)
            .resolves({
              ok: true,
              json: () => Promise.resolve({ status: 'completed', message: 'awesome', app_id: 123456 })
            } as any)

          fetchStub.withArgs('https://z3ntest.zendesk.com/api/v2/apps/job_statuses/128', sinon.match.any)
            .resolves({
              ok: true,
              json: () => Promise.resolve({ status: 'completed', message: 'awesome', app_id: 123458 })
            } as any)

          fetchStub.withArgs('https://z3ntest.zendesk.com/api/support/apps/installations.json', sinon.match.any)
            .onFirstCall().resolves({
              ok: true,
              json: () => Promise.resolve({})
            } as any)
            .onSecondCall().resolves({
              ok: true,
              json: () => Promise.resolve({})
            } as any)
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

          fetchStub.withArgs('https://z3ntest.zendesk.com/api/apps.json', {
            method: 'POST',
            headers: sinon.match.any,
            body: sinon.match(function (body) {
              return body.includes('Test App 1')
            })
          })
            .resolves({
              ok: true,
              json: () => Promise.resolve({ job_id: 129 })
            } as any)

          fetchStub.withArgs('https://z3ntest.zendesk.com/api/v2/apps/job_statuses/129', sinon.match.any)
            .resolves({
              ok: true,
              json: () => Promise.resolve({ status: 'completed', message: 'awesome', app_id: 123456 })
            } as any)

          fetchStub.withArgs('https://z3ntest.zendesk.com/api/support/apps/installations.json', sinon.match.any)
            .resolves({
              ok: true,
              json: () => Promise.resolve({})
            } as any)
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

          fetchStub.withArgs('https://z3ntest.zendesk.com/api/apps.json', {
            method: 'POST',
            headers: sinon.match.any,
            body: sinon.match(function (body) {
              return body.includes('Test App 1') && body.includes('819')
            })
          })
            .resolves({
              ok: true,
              json: () => Promise.resolve({ job_id: 129 })
            } as any)

          fetchStub.withArgs('https://z3ntest.zendesk.com/api/v2/apps/job_statuses/129', sinon.match.any)
            .resolves({
              ok: true,
              json: () => Promise.resolve({ status: 'completed', message: 'awesome', app_id: 123456 })
            } as any)
        })
        .stdout()
        .command(['apps:create', requirementsOnlyApp])
        .it('should create said apps', async ctx => {
          expect(ctx.stdout).to.contain(successCreateMessage)
        })
    })
  })

  describe('update', () => {
    beforeEach(() => {
      fetchStub = sandbox.stub(global, 'fetch')
    })

    afterEach(() => {
      sandbox.restore()
    })

    describe('with single app', () => {
      test
        .stub(packageUtil, 'createAppPkg', () => createAppPkgStub)
        .env(env)
        .do(() => {
          createAppPkgStub.onFirstCall().resolves('thePathLessFrequentlyTravelled')
          uploadAppPkgStub.onFirstCall().resolves({ id: 819 })

          fetchStub.withArgs('https://z3ntest.zendesk.com/api/v2/apps/123456', {
            method: 'PUT',
            headers: sinon.match.any,
            body: JSON.stringify({ upload_id: 819 })
          })
            .resolves({
              ok: true,
              json: () => Promise.resolve({ job_id: 129 })
            } as any)

          fetchStub.withArgs('https://z3ntest.zendesk.com/api/v2/apps/job_statuses/129', sinon.match.any)
            .resolves({
              ok: true,
              json: () => Promise.resolve({ status: 'completed', message: 'awesome', app_id: 123456 })
            } as any)
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

          fetchStub.withArgs('https://z3ntest.zendesk.com/api/v2/apps/123456', {
            method: 'PUT',
            headers: sinon.match.any,
            body: JSON.stringify({ upload_id: 819 })
          })
            .resolves({
              ok: true,
              json: () => Promise.resolve({ job_id: 129 })
            } as any)

          fetchStub.withArgs('https://z3ntest.zendesk.com/api/v2/apps/job_statuses/129', sinon.match.any)
            .resolves({
              ok: true,
              json: () => Promise.resolve({ status: 'completed', message: 'awesome', app_id: 123456 })
            } as any)
        })
        .stdout()
        .command(['apps:update', requirementsOnlyApp])
        .it('should update said apps', async ctx => {
          expect(ctx.stdout).to.contain(successUpdateMessage)
        })
    })
  })
})
