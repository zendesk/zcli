/**
 * Integration test for VEG-4556: bundle output cleanup
 *
 * Runs a REAL Vite build (nothing stubbed) against a connector located
 * outside process.cwd(), with a pre-populated dist/ containing stale files.
 * Asserts that the build starts from a clean output directory and that both
 * the final dist tree and the upload-ready ZIP contain only bundle contract
 * files.
 */

import { expect } from 'chai'
import { existsSync, mkdirSync, realpathSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import * as AdmZip from 'adm-zip'
import { ViteConfigBuilder, ViteRunner } from '../../src/lib/vite'

describe('bundle clean output integration (VEG-4556)', function () {
  this.timeout(120_000)

  let connectorDir: string
  let outputPath: string

  before(function () {
    // Connector lives outside the repository working directory. Resolve the
    // temp dir symlink (e.g. /var -> /private/var on macOS) so paths match
    // the manifest generator's realpath checks.
    connectorDir = join(realpathSync(tmpdir()), `zcli-clean-output-test-${Date.now()}`)
    outputPath = join(connectorDir, 'dist')

    // Minimal SDK-free connector: the manifest generator only needs a
    // default export with name/title/description
    mkdirSync(join(connectorDir, 'src', 'assets'), { recursive: true })
    writeFileSync(
      join(connectorDir, 'src', 'index.ts'),
      `export default {
        name: 'clean-output-test',
        title: 'Clean Output Test',
        description: 'Verifies stale bundle output is cleaned',
        author: 'zcli-test',
        version: '0.0.1'
      };\n`)
    writeFileSync(
      join(connectorDir, 'src', 'assets', 'logo.svg'),
      '<svg xmlns="http://www.w3.org/2000/svg"/>\n')
    // Unsupported source asset: filtered by the bundle contract allowlist
    writeFileSync(
      join(connectorDir, 'src', 'assets', 'icon.svg'),
      '<svg xmlns="http://www.w3.org/2000/svg"/>\n')

    // Pre-populate dist with stale files from a "previous build"
    mkdirSync(join(connectorDir, 'dist', 'assets'), { recursive: true })
    writeFileSync(join(connectorDir, 'dist', 'assets', 'stale-secret.txt'), 'secret\n')
    writeFileSync(join(connectorDir, 'dist', 'assets', '.DS_Store'), 'junk\n')
    writeFileSync(join(connectorDir, 'dist', 'unexpected-root.txt'), 'junk\n')
  })

  after(function () {
    if (connectorDir && existsSync(connectorDir)) {
      rmSync(connectorDir, { recursive: true, force: true })
    }
  })

  it('should build from a clean output directory and archive only contract files', async function () {
    const config = ViteConfigBuilder.createConfig({
      inputPath: connectorDir,
      outputPath,
      archiveOutputPath: connectorDir
    })

    const stats = await ViteRunner.run(config)
    expect(stats.hasErrors(), JSON.stringify(stats.toJson().errors)).to.equal(false)

    // Final dist tree: freshly built contract files only
    expect(existsSync(join(outputPath, 'connector.js'))).to.equal(true)
    expect(existsSync(join(outputPath, 'manifest.json'))).to.equal(true)
    expect(existsSync(join(outputPath, 'assets', 'logo.svg'))).to.equal(true)

    // Stale output files must not survive the build
    expect(existsSync(join(outputPath, 'assets', 'stale-secret.txt'))).to.equal(false)
    expect(existsSync(join(outputPath, 'assets', '.DS_Store'))).to.equal(false)
    expect(existsSync(join(outputPath, 'unexpected-root.txt'))).to.equal(false)

    // ZIP contains the same clean contract-only tree
    const zipPath = join(connectorDir, 'clean-output-test-0.0.1.zip')
    expect(existsSync(zipPath)).to.equal(true)

    const entries = new AdmZip(zipPath).getEntries().map(entry => entry.entryName)
    expect(entries).to.include('connector.js')
    expect(entries).to.include('manifest.json')
    expect(entries.some(name => name.replace(/\\/g, '/') === 'assets/logo.svg')).to.equal(true)
    expect(entries).to.not.include('assets/stale-secret.txt')
    expect(entries).to.not.include('assets/.DS_Store')
    expect(entries).to.not.include('unexpected-root.txt')
  })

  it('should reject an outputPath equal to the connector directory without deleting any files', () => {
    const sentinelPath = join(connectorDir, 'unrelated-file.txt')
    writeFileSync(sentinelPath, 'sentinel')

    // The output directory is deliberately emptied on every build, so
    // pointing it at the connector directory must be rejected before Vite
    // runs; otherwise the connector sources and unrelated files are erased
    expect(() => ViteConfigBuilder.createConfig({
      inputPath: connectorDir,
      outputPath: connectorDir
    })).to.throw(/must not be the connector directory/)

    expect(existsSync(join(connectorDir, 'src', 'index.ts'))).to.be.true
    expect(existsSync(sentinelPath)).to.be.true
  })
})
