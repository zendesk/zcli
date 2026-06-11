/**
 * Integration test for VEG-3916: Windows .cmd shell execution fix
 *
 * Runs the REAL Bundle command against a temp project with typescript
 * installed. Only Vite is stubbed (not needed for this test). The
 * checkTypeScript() method executes for real — exercising the actual
 * execFileSync call path in bundle.ts.
 *
 * WITHOUT the fix (shell option missing), this test FAILS on Windows
 * with EINVAL because .cmd batch wrappers need shell:true.
 */

import * as sinon from 'sinon'
import { execSync } from 'child_process'
import { mkdirSync, writeFileSync, existsSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import BundleCommand from '../../src/commands/connectors/bundle'
import { ViteConfigBuilder, ViteRunner } from '../../src/lib/vite'

describe('Windows tsc.cmd integration (VEG-3916)', function () {
  this.timeout(120_000)

  let projectDir: string

  before(function () {
    // Create a temp project with typescript installed
    projectDir = join(tmpdir(), `zcli-win-tsc-test-${Date.now()}`)
    mkdirSync(projectDir, { recursive: true })

    writeFileSync(join(projectDir, 'package.json'), JSON.stringify({
      name: 'tsc-integration-test',
      private: true,
      dependencies: { typescript: '^5' }
    }))

    writeFileSync(join(projectDir, 'tsconfig.json'), JSON.stringify({
      compilerOptions: {
        strict: true,
        noEmit: true,
        target: 'ES2020',
        module: 'commonjs'
      },
      include: ['*.ts']
    }))

    // Valid TypeScript file so tsc --noEmit succeeds
    writeFileSync(join(projectDir, 'index.ts'), 'export const x: number = 1;\n')

    // Install typescript to get the real tsc / tsc.cmd binary
    execSync('npm install --ignore-scripts', { cwd: projectDir, stdio: 'pipe' })
  })

  after(function () {
    if (projectDir && existsSync(projectDir)) {
      rmSync(projectDir, { recursive: true, force: true })
    }
  })

  afterEach(function () {
    sinon.restore()
  })

  it('should run checkTypeScript successfully via the real Bundle command', async function () {
    // Stub only Vite — let checkTypeScript run for real against the temp project
    sinon.stub(ViteConfigBuilder, 'createConfig').returns({
      build: {
        watch: false,
        target: '',
        lib: { entry: '', fileName: '', formats: [] },
        outDir: '',
        minify: false,
        rollupOptions: {
          plugins: [],
          external: () => false,
          output: { inlineDynamicImports: false, format: '' }
        }
      }
    })
    sinon.stub(ViteRunner, 'run').resolves({
      hasErrors: () => false,
      hasWarnings: () => false,
      toJson: () => ({ errors: [], warnings: [], assets: [] })
    })

    const bundleCommand = new BundleCommand([], {} as any)
    sinon.stub(bundleCommand, 'parse' as any).resolves({
      args: { path: projectDir },
      flags: { watch: false, verbose: false }
    })
    sinon.stub(bundleCommand, 'log')

    // This exercises the real checkTypeScript() in bundle.ts.
    // On Windows without shell:true, this throws EINVAL on tsc.cmd.
    await bundleCommand.run()
  })
})
