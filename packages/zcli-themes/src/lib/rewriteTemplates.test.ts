import * as sinon from 'sinon'
import * as fs from 'fs'
import { expect } from '@oclif/test'
import rewriteTemplates from './rewriteTemplates'

describe('rewriteTemplates', () => {
  beforeEach(() => {
    sinon.restore()
  })

  it('writes templates to the correct file paths', () => {
    const writeFileSyncStub = sinon.stub(fs, 'writeFileSync')

    const templates = {
      home_page: '<h1>Updated Home</h1>',
      article_page: '<h1>Updated Article</h1>',
      'custom_pages/faq': '<h1>Updated FAQ</h1>'
    }

    rewriteTemplates('theme/path', templates)

    expect(writeFileSyncStub.callCount).to.equal(3)
    expect(writeFileSyncStub.firstCall.args).to.deep.equal([
      'theme/path/templates/home_page.hbs',
      '<h1>Updated Home</h1>'
    ])
    expect(writeFileSyncStub.secondCall.args).to.deep.equal([
      'theme/path/templates/article_page.hbs',
      '<h1>Updated Article</h1>'
    ])
    expect(writeFileSyncStub.thirdCall.args).to.deep.equal([
      'theme/path/templates/custom_pages/faq.hbs',
      '<h1>Updated FAQ</h1>'
    ])
  })

  it('ignores write errors', () => {
    const writeFileSyncStub = sinon.stub(fs, 'writeFileSync')

    writeFileSyncStub.onFirstCall().throws(new Error('Permission denied'))
    writeFileSyncStub.onSecondCall().returns(undefined)

    const templates = {
      home_page: '<h1>Updated Home</h1>',
      article_page: '<h1>Updated Article</h1>'
    }

    expect(() => {
      rewriteTemplates('theme/path', templates)
    }).to.not.throw()

    expect(writeFileSyncStub.callCount).to.equal(2)
  })

  it('handles empty templates object', () => {
    const writeFileSyncStub = sinon.stub(fs, 'writeFileSync')

    const templates = {}

    rewriteTemplates('theme/path', templates)

    expect(writeFileSyncStub.callCount).to.equal(0)
  })

  it('handles nested template paths correctly', () => {
    const writeFileSyncStub = sinon.stub(fs, 'writeFileSync')

    const templates = {
      'article_pages/product_updates': '<h1>Product Updates</h1>',
      'custom_pages/deep/nested/template': '<h1>Nested Template</h1>'
    }

    rewriteTemplates('theme/path', templates)

    expect(writeFileSyncStub.callCount).to.equal(2)
    expect(writeFileSyncStub.firstCall.args).to.deep.equal([
      'theme/path/templates/article_pages/product_updates.hbs',
      '<h1>Product Updates</h1>'
    ])
    expect(writeFileSyncStub.secondCall.args).to.deep.equal([
      'theme/path/templates/custom_pages/deep/nested/template.hbs',
      '<h1>Nested Template</h1>'
    ])
  })
})
