import { expect } from '@oclif/test'
import migrationReportToString from './migrationReportToString'
import type { MigrationReport } from '../types'

describe('migrationReportToString', () => {
  it('renders a single-line "no migrations fired" message for an empty report', () => {
    expect(migrationReportToString({})).to.contain('no migrations fired')
  })

  it('renders a single-line "no migrations fired" message for a missing report', () => {
    expect(migrationReportToString(undefined)).to.contain('no migrations fired')
  })

  it('opens with the green success line when there are fired migrations', () => {
    const report: MigrationReport = {
      article_page: [
        { target: 'a', strategy: 'inline', description: 'd', test_plan: 't' }
      ]
    }

    expect(migrationReportToString(report)).to.contain('Theme migrated successfully')
  })

  it('groups entries by template identifier and sorts groups', () => {
    const report: MigrationReport = {
      header: [
        { target: 'user_info', strategy: 'partial', description: 'desc-A', test_plan: 'test-A' }
      ],
      article_page: [
        { target: 'section.internal', strategy: 'inline', description: 'desc-B', test_plan: 'test-B' }
      ]
    }

    const string = migrationReportToString(report)

    expect(string).to.contain('article_page')
    expect(string).to.contain('header')
    expect(string.indexOf('article_page')).to.be.lessThan(string.indexOf('header'))
  })

  it('preserves server order within a template group', () => {
    const report: MigrationReport = {
      article_page: [
        { target: 'section.internal', strategy: 'inline', description: 'first', test_plan: 't1' },
        { target: 'breadcrumbs', strategy: 'partial', description: 'second', test_plan: 't2' },
        { target: 'related_articles', strategy: 'partial', description: 'third', test_plan: 't3' }
      ]
    }

    const string = migrationReportToString(report)

    expect(string.indexOf('first')).to.be.lessThan(string.indexOf('second'))
    expect(string.indexOf('second')).to.be.lessThan(string.indexOf('third'))
  })

  it('does not render strategy labels', () => {
    const report: MigrationReport = {
      doc: [
        { target: 'a', strategy: 'inline', description: 'd1', test_plan: 't1' },
        { target: 'b', strategy: 'partial', description: 'd2', test_plan: 't2' },
        { target: 'c', strategy: 'prefix', description: 'd3', test_plan: 't3' }
      ]
    }

    const string = migrationReportToString(report)

    expect(string).to.not.contain('inline')
    expect(string).to.not.contain('partial')
    expect(string).to.not.contain('prefix')
  })

  it('renders the description and the test plan without a "Test:" prefix', () => {
    const report: MigrationReport = {
      header: [
        {
          target: 'user_info',
          strategy: 'partial',
          description: 'The `user_info` helper is rewritten as a partial.',
          test_plan: 'Verify the dropdown still opens.'
        }
      ]
    }

    const string = migrationReportToString(report)

    expect(string).to.contain('The `user_info` helper is rewritten as a partial.')
    expect(string).to.contain('Verify the dropdown still opens.')
    expect(string).to.not.contain('Test:')
  })

  it('falls back to a description-only line when target is null', () => {
    const report: MigrationReport = {
      doc: [
        { target: null, strategy: 'prefix', description: 'Bundled normalize.css.', test_plan: 'Verify CSS resets.' }
      ]
    }

    const string = migrationReportToString(report)

    expect(string).to.contain('Bundled normalize.css.')
    expect(string).to.contain('Verify CSS resets.')
  })

  it('does not render the template file path on the subheader line', () => {
    const report: MigrationReport = {
      article_page: [
        { target: 'a', strategy: 'inline', description: 'd', test_plan: 't' }
      ]
    }

    const string = migrationReportToString(report)

    expect(string).to.not.contain('templates/article_page.hbs')
    expect(string).to.not.contain('.hbs')
  })
})
