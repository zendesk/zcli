// The snippet is appended (never prepended) and kept to a single line so the
// bundle's sourcemap line mappings stay intact, and it must stay free of
// imports/exports so the bundle keeps working as a plain ES module.
export default function appendLivereloadSnippet (source: string, wsBaseUrl: string, label: string): string {
  const snippet = `;(() => { const s = new WebSocket(${JSON.stringify(`${wsBaseUrl}/livereload`)}); s.onopen = () => console.log(${JSON.stringify(`[zcli] Previewing ${label} — reloading on change`)}); s.onmessage = e => e.data === 'reload' && location.reload(); })();\n`

  const marker = '//# sourceMappingURL='
  const markerIndex = source.lastIndexOf(marker)
  const markerOnOwnLastLine = markerIndex !== -1 &&
    (markerIndex === 0 || source[markerIndex - 1] === '\n') &&
    !source.slice(markerIndex).trimEnd().includes('\n')

  if (markerOnOwnLastLine) {
    return source.slice(0, markerIndex) + snippet + source.slice(markerIndex)
  }

  return (source.endsWith('\n') ? source : `${source}\n`) + snippet
}
