import * as sinon from 'sinon'
import * as fs from 'fs'
import { expect } from '@oclif/test'
import getComponent from './getComponent'

describe('getComponent', () => {
  beforeEach(() => {
    sinon.restore()
  })

  it('returns the component.json file parsed as json', () => {
    const existsSyncStub = sinon.stub(fs, 'existsSync')
    const readFileSyncStub = sinon.stub(fs, 'readFileSync')

    const component = {
      name: 'request_list',
      version: '1.0.0',
      settings: [],
      data_requirements: { locale: { source: 'help_center.base_locale' } }
    }

    existsSyncStub
      .withArgs('component/path/component.json')
      .returns(true)

    readFileSyncStub
      .withArgs('component/path/component.json')
      .returns(JSON.stringify(component))

    expect(getComponent('component/path')).to.deep.equal(component)
  })

  it('throws an error when it can\'t find a component.json file', () => {
    const existsSyncStub = sinon.stub(fs, 'existsSync')

    existsSyncStub
      .withArgs('component/path/component.json')
      .returns(false)

    expect(() => {
      getComponent('component/path')
    }).to.throw('Couldn\'t find a component.json file at path: "component/path/component.json"')
  })

  it('throws an error when the component.json file is malformed', () => {
    const existsSyncStub = sinon.stub(fs, 'existsSync')
    const readFileSyncStub = sinon.stub(fs, 'readFileSync')

    existsSyncStub
      .withArgs('component/path/component.json')
      .returns(true)

    readFileSyncStub
      .withArgs('component/path/component.json')
      .returns('{"name": "request_list",,, }')

    expect(() => {
      getComponent('component/path')
    }).to.throw('component.json file was malformed at path: "component/path/component.json"')
  })

  it('throws an error when name or version are missing', () => {
    const existsSyncStub = sinon.stub(fs, 'existsSync')
    const readFileSyncStub = sinon.stub(fs, 'readFileSync')

    existsSyncStub
      .withArgs('component/path/component.json')
      .returns(true)

    readFileSyncStub
      .withArgs('component/path/component.json')
      .returns(JSON.stringify({ name: 'request_list' }))

    expect(() => {
      getComponent('component/path')
    }).to.throw('must declare a "name" and a "version"')
  })
})
