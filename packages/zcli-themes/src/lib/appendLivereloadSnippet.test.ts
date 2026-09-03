import { expect } from '@oclif/test'
import appendLivereloadSnippet from './appendLivereloadSnippet'

describe('appendLivereloadSnippet', () => {
  it('appends a single-line livereload snippet', () => {
    const wrapped = appendLivereloadSnippet('export const mount = () => {};\n', 'ws://localhost:4568', 'request_list@1.0.0')

    const snippet = wrapped.replace('export const mount = () => {};\n', '')
    expect(snippet.trim().split('\n')).to.have.length(1)
    expect(snippet).to.contain('new WebSocket("ws://localhost:4568/livereload")')
    expect(snippet).to.contain('location.reload()')
    expect(snippet).to.contain('request_list@1.0.0')
  })

  it('escapes interpolated values as JSON strings', () => {
    const wrapped = appendLivereloadSnippet('code();\n', 'ws://x', "it's@1.0.0")

    expect(wrapped).to.contain('"[zcli] Previewing it\'s@1.0.0')
    expect(wrapped).not.to.contain("'it's")
  })

  it('keeps the original source untouched', () => {
    const source = 'line1\nline2\n'
    expect(appendLivereloadSnippet(source, 'ws://x', 'l')).to.match(/^line1\nline2\n/)
  })

  it('inserts the snippet before a trailing sourceMappingURL comment', () => {
    const source = 'compiled();\n//# sourceMappingURL=index.js.map'
    const wrapped = appendLivereloadSnippet(source, 'ws://x', 'l')

    const lines = wrapped.split('\n')
    expect(lines[lines.length - 1]).to.eq('//# sourceMappingURL=index.js.map')
    expect(lines[0]).to.eq('compiled();')
  })

  it('inserts the snippet before a trailing sourceMappingURL comment with trailing newline', () => {
    const source = 'compiled();\n//# sourceMappingURL=index.js.map\n'
    const wrapped = appendLivereloadSnippet(source, 'ws://x', 'l')

    const lines = wrapped.split('\n')
    expect(lines[lines.length - 1]).to.eq('')
    expect(lines[lines.length - 2]).to.eq('//# sourceMappingURL=index.js.map')
    expect(lines[0]).to.eq('compiled();')
  })

  it('treats a sourceMappingURL mention that is not a trailing comment as code', () => {
    const source = 'const s = "//# sourceMappingURL=not-a-comment";\nmore();\n'
    const wrapped = appendLivereloadSnippet(source, 'ws://x', 'l')

    expect(wrapped.startsWith(source)).to.eq(true)
  })
})
