import babel from '@rollup/plugin-babel'
import commonjs from '@rollup/plugin-commonjs'
import nodeResolve from '@rollup/plugin-node-resolve'
import { existsSync, copyFileSync, lstatSync, mkdirSync, readdirSync, realpathSync, statSync } from 'fs'
import { readFile } from 'fs/promises'
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'path'
import { ManifestGenerator } from '../manifest-generator/generator'
import { createPackageArchive } from '../publish/publish'
import { isAllowedAssetFile, isAllowedTranslationFile, isOSMetadataEntry } from '../bundleContract'

export interface ViteConfigOptions {
  inputPath: string;
  outputPath: string;
  watch?: boolean;
  mode?: string;
  targetDir?: string;
  archiveOutputPath?: string;
}

// Minimal Vite config interface
interface ViteUserConfig {
  root: string;
  configFile: false;
  publicDir: false;
  envDir: false;
  build: {
    watch: boolean | object
    emptyOutDir: boolean;
    target: string;
    lib: {
      entry: string;
      fileName: string;
      formats: string[];
    };
    outDir: string;
    minify: false;
    rollupOptions: {
      plugins: any[];
      external: (id: string) => boolean;
      output: {
        inlineDynamicImports: boolean;
        format: string;
      };
    };
  };
}

export class ViteConfigBuilder {
  private static createBabelPlugin () {
    return babel({
      babelHelpers: 'bundled',
      presets: [
        [require.resolve('@babel/preset-env'), { targets: { ie: '11' }, modules: false }]
      ],
      extensions: ['.js', '.ts']
    })
  }

  /**
   * Recursively copies a directory from source to destination.
   */
  private static copyDirRecursive (src: string, dest: string): void {
    if (!existsSync(dest)) {
      mkdirSync(dest, { recursive: true })
    }

    const items = readdirSync(src)
    for (const item of items) {
      const srcPath = join(src, item)
      const destPath = join(dest, item)

      if (statSync(srcPath).isDirectory()) {
        this.copyDirRecursive(srcPath, destPath)
      } else {
        copyFileSync(srcPath, destPath)
      }
    }
  }

  /**
   * Copies only the files allowed by the connector bundle contract from
   * a contract directory (assets or translations) to the bundle output.
   *
   * OS metadata entries are reported as 'system' and everything not in
   * the contract (including subdirectories) as 'unexpected' through
   * onSkip, so skips are visible rather than silent (VEG-4556).
   * Paths passed to onSkip are relative to basePath.
   */
  private static copyContractDirectory (
    src: string,
    dest: string,
    isAllowed: (name: string) => boolean,
    onSkip: ((relativePath: string, kind: 'system' | 'unexpected') => void) | undefined,
    basePath: string
  ): void {
    const items = readdirSync(src)
    for (const item of items) {
      const srcPath = join(src, item)
      const relPath = relative(basePath, srcPath)

      if (isOSMetadataEntry(item)) {
        if (onSkip) onSkip(relPath, 'system')
        continue
      }

      // Check the contract allowlist by name before touching the filesystem:
      // a dangling symlink to a disallowed entry must be skipped with a
      // warning, not abort the build with ENOENT (VEG-4556)
      if (!isAllowed(item)) {
        if (onSkip) onSkip(relPath, 'unexpected')
        continue
      }

      // An allowed name that is a directory (or a broken symlink, which
      // throws from statSync) is a real problem: directories are skipped and
      // broken contract files fail the build loudly
      if (statSync(srcPath).isDirectory()) {
        if (onSkip) onSkip(relPath, 'unexpected')
        continue
      }

      if (!existsSync(dest)) {
        mkdirSync(dest, { recursive: true })
      }
      copyFileSync(srcPath, join(dest, item))
    }
  }

  /**
   * Creates the external function for determining which modules to bundle
   */
  private static createExternalFunction (): (id: string) => boolean {
    return (id: string) => {
      if (id.includes('@zendesk/connector-sdk')) {
        return false
      }

      return !id.startsWith('.') && !isAbsolute(id)
    }
  }

  /**
   * Creates a plugin to copy assets and translations
   */
  private static createAssetCopyPlugin (inputPath: string, outputPath: string) {
    return {
      name: 'copy-assets-translations',
      writeBundle: function (this: { info?: (message: string) => void, warn?: (message: string) => void } | undefined) {
        // Route skip messages through the bundler's plugin logging so output
        // stays controllable by the CLI/CI consumer (VEG-4556)
        const info = this?.info
        const warn = this?.warn
        const onSkip = (relativePath: string, kind: 'system' | 'unexpected') => {
          if (kind === 'system') {
            if (typeof info === 'function') info.call(this, `Skipping system file: ${relativePath}`)
          } else if (typeof warn === 'function') {
            warn.call(this, `Skipping unexpected file not in the connector bundle contract: ${relativePath}`)
          }
        }

        // Copy assets — only the bundle contract files (assets/logo.svg)
        const assetsDir = join(inputPath, 'src/assets')
        if (existsSync(assetsDir)) {
          const targetAssetsDir = join(outputPath, 'assets')
          ViteConfigBuilder.copyContractDirectory(assetsDir, targetAssetsDir, isAllowedAssetFile, onSkip, inputPath)
        }

        // Copy translations — only the bundle contract files (translations/<locale>.json)
        const translationsDir = join(inputPath, 'src/translations')
        if (existsSync(translationsDir)) {
          const targetTranslationsDir = join(outputPath, 'translations')
          ViteConfigBuilder.copyContractDirectory(translationsDir, targetTranslationsDir, isAllowedTranslationFile, onSkip, inputPath)
        }

        // Copy settings.json from src root
        const settingsFile = join(inputPath, 'src', 'settings.json')
        if (existsSync(settingsFile)) {
          copyFileSync(settingsFile, join(outputPath, 'settings.json'))
        }
      }
    }
  }

  /**
   * Creates a plugin to generate manifest.json
   */
  private static createManifestPlugin (
    outputPath: string,
    mode = 'production',
    targetDir?: string
  ) {
    return {
      name: 'generate-manifest',
      async writeBundle () {
        try {
          await ManifestGenerator.generateManifest({
            outputPath
          })

          // Copy to custom target directory after manifest is generated
          if (mode === 'development' && targetDir) {
            if (!existsSync(targetDir)) {
              mkdirSync(targetDir, { recursive: true })
            }
            ViteConfigBuilder.copyDirRecursive(outputPath, targetDir)
          }
        } catch (error) {
          console.error('Failed to generate manifest:', error)
          throw error
        }
      }
    }
  }

  private static createArchivePlugin (
    outputPath: string,
    archiveOutputPath: string
  ) {
    return {
      name: 'create-connector-archive',
      writeBundle: {
        order: 'post' as const,
        sequential: true,
        async handler () {
          const manifestPath = join(outputPath, 'manifest.json')
          const manifest = JSON.parse(await readFile(manifestPath, 'utf-8'))

          if (!manifest.name || !manifest.version) {
            throw new Error('Connector name and version are required in manifest.json')
          }

          if (/[/\\]/.test(manifest.name)) {
            throw new Error(`Invalid connector name "${manifest.name}": must not contain path separators`)
          }

          const archiveName = `${manifest.name}-${manifest.version}`
          await createPackageArchive(outputPath, archiveName, archiveOutputPath)
        }
      }
    }
  }

  private static createBaseConfig (
    inputPath: string,
    outputPath: string,
    plugins: any[],
    externalFn: (id: string) => boolean,
    watch?: boolean
  ): ViteUserConfig {
    return {
      // Scope the project root to the connector directory so the dist output
      // is internal to it and deliberately emptied on every build: stale
      // files from previous builds must not survive into the bundle or the
      // upload-ready ZIP (VEG-4556)
      root: inputPath,
      // Keep bundling fully driven by this CLI config and the bundle
      // contract: do not merge a connector-local vite config, do not copy a
      // <root>/public directory into dist, and do not inline connector-local
      // .env values into the bundle
      configFile: false,
      publicDir: false,
      envDir: false,
      build: {
        watch: watch ? {} : false,
        emptyOutDir: true,
        target: 'es2015',
        lib: {
          entry: join(inputPath, 'src', 'index.ts'),
          fileName: 'connector',
          formats: ['cjs']
        },
        outDir: outputPath,
        minify: false,
        rollupOptions: {
          plugins,
          external: externalFn,
          output: {
            inlineDynamicImports: true,
            format: 'cjs'
          }
        }
      }
    }
  }

  private static createLocalConfig (options: ViteConfigOptions): ViteUserConfig {
    const { inputPath, outputPath, mode, targetDir, archiveOutputPath } = options

    const plugins = [
      nodeResolve({
        extensions: ['.js', '.ts', '.mjs'],
        preferBuiltins: true,
        exportConditions: ['node']
      }),
      commonjs(),
      this.createBabelPlugin(),
      this.createAssetCopyPlugin(inputPath, outputPath),
      this.createManifestPlugin(outputPath, mode, targetDir)
    ]

    if (archiveOutputPath) {
      plugins.push(this.createArchivePlugin(outputPath, archiveOutputPath))
    }

    const external = this.createExternalFunction()

    return this.createBaseConfig(inputPath, outputPath, plugins, external, options.watch)
  }

  private static createNpmConfig (options: ViteConfigOptions): ViteUserConfig {
    const { inputPath, outputPath, mode, targetDir, archiveOutputPath } = options
    // For npm mode, we only need babel - no nodeResolve or commonjs
    const plugins = [
      this.createBabelPlugin(),
      this.createAssetCopyPlugin(inputPath, outputPath),
      this.createManifestPlugin(outputPath, mode, targetDir)
    ]

    if (archiveOutputPath) {
      plugins.push(this.createArchivePlugin(outputPath, archiveOutputPath))
    }

    const external = this.createExternalFunction()

    return this.createBaseConfig(inputPath, outputPath, plugins, external, options.watch)
  }

  /**
   * Validates that deliberately emptying outputPath on every build cannot
   * erase connector sources or unrelated files. The output directory must
   * never equal or contain the connector directory, and must never overlap
   * the src directory (VEG-4556).
   */
  private static validateOutputPath (inputPath: string, outputPath: string): void {
    const resolvedInput = resolve(inputPath)
    const resolvedOutput = resolve(outputPath)
    const resolvedSrc = join(resolvedInput, 'src')
    const contains = (parent: string, child: string): boolean =>
      child === parent || child.startsWith(parent + sep)

    if (contains(resolvedOutput, resolvedInput)) {
      throw new Error(
        `Invalid outputPath "${outputPath}": it must not be the connector directory or one of its parent directories. ` +
        'The output directory is emptied on every bundle, so this would delete connector sources and unrelated files.'
      )
    }

    if (contains(resolvedOutput, resolvedSrc) || contains(resolvedSrc, resolvedOutput)) {
      throw new Error(
        `Invalid outputPath "${outputPath}": it must not overlap the connector src directory (${resolvedSrc}). ` +
        'The output directory is emptied on every bundle, so this could delete connector source files.'
      )
    }

    // Lexical normalization cannot see symlinks: a dist directory (or an
    // ancestor of a custom output path) that is a symbolic link would
    // redirect the deliberate empty-on-build deletion outside the connector
    // directory. Canonicalize against the filesystem and require the
    // canonical output to remain strictly inside the canonical connector
    // directory (VEG-4556).
    if (!existsSync(resolvedInput)) {
      return
    }
    const canonicalInput = realpathSync(resolvedInput)

    // The output may not exist yet; canonicalize the nearest existing
    // ancestor and re-append the remaining segments. A dangling symlink
    // component is rejected outright: its target could be created outside
    // the connector before the build empties and writes through it.
    let existingPath = resolvedOutput
    const pendingSegments: string[] = []
    while (!existsSync(existingPath)) {
      let stats
      try {
        stats = lstatSync(existingPath)
      } catch {
        stats = undefined
      }
      if (stats?.isSymbolicLink()) {
        throw new Error(
          `Invalid outputPath "${outputPath}": "${existingPath}" is a dangling symbolic link. ` +
          'The output directory is emptied on every bundle, so its target could be created outside the connector before the build writes through it.'
        )
      }
      pendingSegments.unshift(basename(existingPath))
      const parent = dirname(existingPath)
      if (parent === existingPath) {
        return
      }
      existingPath = parent
    }

    const canonicalOutput = join(realpathSync(existingPath), ...pendingSegments)
    if (canonicalOutput === canonicalInput || !canonicalOutput.startsWith(canonicalInput + sep)) {
      throw new Error(
        `Invalid outputPath "${outputPath}": its canonical location "${canonicalOutput}" must be strictly inside the connector directory "${canonicalInput}". ` +
        'Symbolic links in the output path must not redirect the bundle output directory, because it is emptied on every bundle.'
      )
    }

    // Containment alone is not enough: a symlink such as dist -> src keeps
    // the canonical output inside the connector while redirecting the
    // empty-on-build deletion onto the connector sources. Repeat the src
    // overlap checks against canonical paths (VEG-4556).
    const canonicalSrc = join(canonicalInput, 'src')
    if (existsSync(canonicalSrc)) {
      const realSrc = realpathSync(canonicalSrc)
      if (contains(canonicalOutput, realSrc) || contains(realSrc, canonicalOutput)) {
        throw new Error(
          `Invalid outputPath "${outputPath}": its canonical location "${canonicalOutput}" must not overlap the connector src directory (${realSrc}). ` +
          'The output directory is emptied on every bundle, so this could delete connector source files.'
        )
      }
    }
  }

  static createConfig (
    options: ViteConfigOptions
  ): ViteUserConfig {
    this.validateOutputPath(options.inputPath, options.outputPath)
    return this.createNpmConfig(options)
  }
}

// Export a helper function to create Vite config
export function createConnectorViteConfig (
  options: ViteConfigOptions
): ViteUserConfig {
  return ViteConfigBuilder.createConfig(options)
}
