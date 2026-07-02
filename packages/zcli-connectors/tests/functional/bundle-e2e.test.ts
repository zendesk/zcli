/* eslint-disable no-unused-expressions */

import { expect } from 'chai'
import * as fs from 'fs'
import * as os from 'os'
import { join } from 'path'
import { createConnectorViteConfig, ViteRunner } from '../../src/lib/vite'

/**
 * End-to-end bundle test that drives a REAL Vite/Rollup build (nothing stubbed).
 * This exercises the actual `external` function against a real, absolute entry
 * path — the code path that CI's mocked bundle test never reaches.
 *
 * On Windows the entry resolves to a drive-letter path (e.g.
 * C:/.../src/index.ts). Rollup normalizes ids to forward slashes, so a buggy
 * `external` check that only recognizes posix absolute paths ("/") flags the
 * entry as external and the build fails with:
 *   "Entry module ... cannot be external."
 *
 * The fixture is the simplest possible connector: a default-export object of
 * the same shape `@zendesk/connector-sdk`'s manifest() returns (name/title/
 * description are the fields ManifestGenerator requires). Keeping it dependency
 * free means the build only tests the entry path, which is where the bug lives.
 */
describe('bundle (e2e real vite build)', function () {
  // A real Vite build is far slower than the default mocha timeout.
  this.timeout(120000)

  let connectorDir: string
  let distDir: string

  beforeEach(() => {
    // realpathSync canonicalizes symlinked temp roots (e.g. macOS /var ->
    // /private/var) so ManifestGenerator's realpath security check passes.
    connectorDir = fs.realpathSync(fs.mkdtempSync(join(os.tmpdir(), 'zcli-connectors-e2e-')))
    distDir = join(connectorDir, 'dist')

    const srcDir = join(connectorDir, 'src')
    fs.mkdirSync(srcDir, { recursive: true })

    // Type-free source: valid as both JS and TS, no external dependencies.
    const indexContents = [
      'const connector = {',
      "  name: 'e2e-fixture',",
      "  title: 'E2E Fixture',",
      "  description: 'E2E bundle test connector',",
      "  version: '1.0.0'",
      '}',
      '',
      'export default connector',
      ''
    ].join('\n')

    fs.writeFileSync(join(srcDir, 'index.ts'), indexContents, 'utf-8')
  })

  afterEach(() => {
    fs.rmSync(connectorDir, { recursive: true, force: true })
  })

  it('bundles a connector without treating the entry as external', async () => {
    const config = createConnectorViteConfig({
      inputPath: connectorDir,
      outputPath: distDir
    })

    const result = await ViteRunner.run(config)

    // On the Windows bug this is true, with an
    // "Entry module ... cannot be external" error.
    expect(result.hasErrors(), JSON.stringify(result.toJson().errors)).to.be.false
    expect(fs.existsSync(join(distDir, 'connector.js'))).to.be.true
    expect(fs.existsSync(join(distDir, 'manifest.json'))).to.be.true
  })
})
