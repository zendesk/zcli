import * as createApp from './createApp'
import { expect, test } from '@oclif/test'
import * as sinon from 'sinon'
import { request } from '@zendesk/zcli-core'
import * as manifest from '../utils/manifest'

describe('deployApp', () => {
  test
    .stub(request, 'requestAPI', () => {
      return { json: sinon.fake.returns({ job_id: 123 }) }
    })
    .it('should return a job_id', async () => {
      expect(await createApp.deployApp('POST', 'https://awesome.url', 123, 'awesomeName')).to.deep.equal({ job_id: 123 })
    })
})

describe('getManifestAppName', () => {
  let appPathSpy: string

  test
    .stub(manifest, 'getManifestFile', (...args) => {
      appPathSpy = (args as string[])[0]
      return { name: 'henry' }
    })
    .it('should return the manifest app name', () => {
      expect(createApp.getManifestAppName('awesomeApp')).to.equal('henry')
      expect(appPathSpy).to.equal('awesomeApp')
    })
})
