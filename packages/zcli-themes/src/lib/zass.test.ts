import type { Variable } from '../types'
import * as sinon from 'sinon'
import * as path from 'path'
import { expect } from '@oclif/test'
import * as errors from '@oclif/core/lib/errors'
import * as chalk from 'chalk'
import zass from './zass'

// Assert on minified css to ignore whitespace differences
const minify = (string: string) => string.replace(/\s+/g, '')

describe('zass', () => {
  beforeEach(() => {
    sinon.restore()
  })

  describe('variables', () => {
    it('replaces all instances of the variable with its value', () => {
      const source = `
        .header {
          color: $font_color;
          font: $font;
          width: #{$title_size}px;
          background: url($assets-background-png);
        }
      `

      const variables: Variable[] = [
        { identifier: 'font_color', type: 'color', value: 'pink' },
        { identifier: 'font', type: 'text', value: 'Verdana' },
        { identifier: 'title_size', type: 'range', value: 100 }
      ]

      const assets: [path.ParsedPath, string][] = [
        [
          { root: '', dir: '', base: 'background.png', ext: '.png', name: 'background' },
          'http://localhost:1000/guide/assets/background.png'
        ]
      ]

      expect(minify(zass(source, variables, assets))).to.deep.equal(minify(`
        .header {
          color: pink;
          font: Verdana;
          width: 100px;
          background: url(http://localhost:1000/guide/assets/background.png);
        }
      `))
    })
  })

  describe('darken', () => {
    it('replaces color with 6 hex digits', () => {
      expect(minify(zass('div { background-color: darken( #ff33cc, 10% ) }', [], []))).to.deep.equal(minify(`
        div { background-color: #ff00bf }
      `))
    })

    it('replaces color with 3 hex digits', () => {
      expect(minify(zass('div { background-color: darken( #ff5, 10% ) }', [], []))).to.deep.equal(minify(`
        div { background-color: #ff2 }
      `))
    })

    it('replaces color with rgb format', () => {
      expect(minify(zass('div { background-color: darken( rgb(255, 1, 2), 10% ) }', [], []))).to.deep.equal(minify(`
        div { background-color: #cd0001 }
      `))
    })

    it('replaces color with hsla format', () => {
      expect(minify(zass('div { background-color: darken( hsla(180, 50%, 50%, 0.2), 20% ) }', [], []))).to.deep.equal(minify(`
        div { background-color: rgba(38, 115, 115, .2) }
      `))
    })

    it('replaces multiple instances of `darken` with different arguments', () => {
      expect(minify(zass(`
        div {
          background-color: darken( #ff33cc, 10% );
          background-color: darken( #ff5, 10% );
          background-color: darken( rgb(255, 1, 2), 10% );
          background-color: darken( hsla(180, 50%, 50%, 0.2), 20% );
        }
      `, [], []))).to.deep.equal(minify(`
        div {
          background-color: #ff00bf;
          background-color: #ff2;
          background-color: #cd0001;
          background-color: rgba(38, 115, 115, .2);
        }
      `))
    })

    it('darkens a color defined in variables', () => {
      expect(minify(zass(
        'div { background-color: darken( $cool_color, 10% ) }',
        [{ identifier: 'cool_color', type: 'color', value: '#ff33cc' }],
        []
      ))).to.deep.equal(minify(`
        div { background-color: #ff00bf }
      `))
    })

    it('errors with a descriptive message without exiting when it cannot darken a variable', () => {
      const errorStub = sinon.stub(errors, 'error')

      zass('div { color: darken( $nonexistent_variable, 10% ); }', [], [])

      expect(errorStub.calledWithExactly(
        `Could not process ${chalk.red('darken( $nonexistent_variable, 10% )')} in style.css`,
        sinon.match({ exit: false })
      )).to.equal(true)
    })
  })

  describe('lighten', () => {
    it('replaces color with 6 hex digits', () => {
      expect(minify(zass('div { background-color: lighten( #5566ff, 10% ) }', [], []))).to.deep.equal(minify(`
        div { background-color: #8894ff }
      `))
    })

    it('replaces color with 3 hex digits', () => {
      expect(minify(zass('div { background-color: lighten( #55d, 10% ) }', [], []))).to.deep.equal(minify(`
        div { background-color: #8080e6 }
      `))
    })

    it('replaces color with rgb format', () => {
      expect(minify(zass('div { background-color: lighten( rgb(255, 1, 2), 10% ) }', [], []))).to.deep.equal(minify(`
        div { background-color: #ff3435 }`
      ))
    })

    it('replaces color with hsla format', () => {
      expect(minify(zass('div { background-color: lighten( hsla(180, 50%, 50%, 0.2), 20% ) }', [], []))).to.deep.equal(minify(`
        div { background-color: rgba(140, 217, 217, .2) }
      `))
    })

    it('replaces multiple instances of `lighten` with different arguments', () => {
      expect(minify(zass(`
        div {
          background-color: lighten( #5566ff, 10% );
          background-color: lighten( #55d, 10% );
          background-color: lighten( rgb(255, 1, 2), 10% );
          background-color: lighten( hsla(180, 50%, 50%, 0.2), 20% );
        }
      `, [], []))).to.deep.equal(minify(`
        div {
          background-color: #8894ff;
          background-color: #8080e6;
          background-color: #ff3435;
          background-color: rgba(140, 217, 217, .2);
        }
      `))
    })

    it('darkens a color defined in variables', () => {
      expect(minify(zass(
        'div { background-color: lighten( $cool_color, 10% ) }',
        [{ identifier: 'cool_color', type: 'color', value: '#5566ff' }],
        [])
      )).to.deep.equal(minify(`
        div { background-color: #8894ff }
      `))
    })

    it('errors with a descriptive message without exiting when it cannot lighten a variable', () => {
      const errorStub = sinon.stub(errors, 'error')

      zass('div { color: lighten( $nonexistent_variable, 10% ); }', [], [])

      expect(errorStub.calledWithExactly(
        `Could not process ${chalk.red('lighten( $nonexistent_variable, 10% )')} in style.css`,
        sinon.match({ exit: false })
      )).to.equal(true)
    })
  })
})
