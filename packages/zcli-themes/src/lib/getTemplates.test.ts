import * as sinon from 'sinon'
import * as fs from 'fs'
import * as glob from 'glob'
import { expect } from '@oclif/test'
import getTemplates from './getTemplates'

describe('getTemplates', () => {
  beforeEach(() => {
    sinon.restore()
  })

  it('returns a map of the templates - identifier: source', () => {
    const globSyncStub = sinon.stub(glob, 'globSync')
    const readFileSyncStub = sinon.stub(fs, 'readFileSync')

    globSyncStub
      .returns([
        '/theme/path/templates/home_page.hbs',
        '/theme/path/templates/article_pages/product_updates.hbs',
        '/theme/path/templates/custom_pages/faq.hbs'
      ])

    readFileSyncStub
      .onFirstCall()
      .returns('<h1>Home</h1>')
      .onSecondCall()
      .returns('<h1>Product updates</h1>')
      .onThirdCall()
      .returns('<h1>FAQ</h1>')

    expect(getTemplates('theme/path')).to.deep.equal({
      home_page: '<h1>Home</h1>',
      'article_pages/product_updates': '<h1>Product updates</h1>',
      'custom_pages/faq': '<h1>FAQ</h1>'
    })
  })

  it('addresses non-posix path separator on windows', () => {
    const globSyncStub = sinon.stub(glob, 'globSync')
    const readFileSyncStub = sinon.stub(fs, 'readFileSync')

    globSyncStub
      .returns([
        '\\theme\\path\\templates\\home_page.hbs',
        '\\theme\\path\\templates\\article_pages\\product_updates.hbs',
        '\\theme\\path\\templates\\custom_pages\\faq.hbs'
      ])

    readFileSyncStub
      .onFirstCall()
      .returns('<h1>Home</h1>')
      .onSecondCall()
      .returns('<h1>Product updates</h1>')
      .onThirdCall()
      .returns('<h1>FAQ</h1>')

    expect(getTemplates('theme/path')).to.deep.equal({
      home_page: '<h1>Home</h1>',
      'article_pages/product_updates': '<h1>Product updates</h1>',
      'custom_pages/faq': '<h1>FAQ</h1>'
    })
  })
})
