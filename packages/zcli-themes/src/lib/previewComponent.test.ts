import * as sinon from 'sinon'
import * as axios from 'axios'
import { expect } from '@oclif/test'
import * as getComponent from './getComponent'
import { request } from '@zendesk/zcli-core'
import * as errors from '@oclif/core/lib/errors'
import previewComponent from './previewComponent'

const component = {
  name: 'request_list',
  version: '1.0.0',
  settings: [{ label: 'group', variables: [{ identifier: 'heading_text', type: 'text', value: 'Request list' }] }],
  data_requirements: { locale: { source: 'help_center.base_locale' } }
}

const flags = {
  bind: 'localhost',
  port: 1000,
  logs: true,
  livereload: true
}

describe('previewComponent', () => {
  beforeEach(() => {
    sinon.restore()
  })

  it('registers the component with the local_preview theme_components endpoint and returns the used baseURL', async () => {
    const getComponentStub = sinon.stub(getComponent, 'default')
    const requestStub = sinon.stub(request, 'requestAPI')

    getComponentStub.withArgs('component/path').returns(component)

    requestStub.returns(Promise.resolve({
      status: 200,
      statusText: 'OK',
      config: { baseURL: 'https://z3ntest.zendesk.com' }
    }) as axios.AxiosPromise)

    const baseUrl = await previewComponent('component/path', flags)

    expect(requestStub.calledWith('/hc/api/internal/theming/local_preview/theme_components', sinon.match({
      method: 'put',
      headers: {
        'X-Zendesk-Request-Originator': 'zcli themes:preview'
      },
      data: {
        theme_components: {
          request_list: {
            version: '1.0.0',
            src: 'http://localhost:1000/theme_components/request_list/1.0.0/index.js',
            settings: component.settings,
            data_requirements: component.data_requirements
          }
        }
      }
    }))).to.equal(true)

    expect(baseUrl).to.equal('https://z3ntest.zendesk.com')
  })

  it('defaults missing settings and data_requirements', async () => {
    const getComponentStub = sinon.stub(getComponent, 'default')
    const requestStub = sinon.stub(request, 'requestAPI')

    getComponentStub.withArgs('component/path').returns({ name: 'request_list', version: '1.0.0' })
    requestStub.returns(Promise.resolve({ status: 200, config: {} }) as axios.AxiosPromise)

    await previewComponent('component/path', flags)

    const data = requestStub.firstCall.args[1].data
    expect(data.theme_components.request_list.settings).to.deep.eq([])
    expect(data.theme_components.request_list.data_requirements).to.deep.eq({})
  })

  it('surfaces the general_error returned by the endpoint', async () => {
    const getComponentStub = sinon.stub(getComponent, 'default')
    const requestStub = sinon.stub(request, 'requestAPI')
    const errorStub = sinon.stub(errors, 'error').callThrough()

    getComponentStub.withArgs('component/path').returns(component)
    requestStub.throws({ response: { status: 422, data: { general_error: 'Theme components are not enabled for this account' } } })

    try {
      await previewComponent('component/path', flags)
    } catch { /* expected */ }

    expect(errorStub.calledOnce).to.eq(true)
    expect(errorStub.firstCall.args[0]).to.eq('Theme components are not enabled for this account')
  })

  it('reports a missing endpoint as unsupported account', async () => {
    const getComponentStub = sinon.stub(getComponent, 'default')
    const requestStub = sinon.stub(request, 'requestAPI')
    const errorStub = sinon.stub(errors, 'error').callThrough()

    getComponentStub.withArgs('component/path').returns(component)
    requestStub.throws({ response: { status: 404, data: {} } })

    try {
      await previewComponent('component/path', flags)
    } catch { /* expected */ }

    expect(errorStub.calledOnce).to.eq(true)
    expect(errorStub.firstCall.args[0]).to.contain('not supported')
  })
})
