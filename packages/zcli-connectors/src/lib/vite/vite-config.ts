import babel from '@rollup/plugin-babel'
import commonjs from '@rollup/plugin-commonjs'
import nodeResolve from '@rollup/plugin-node-resolve'
import { existsSync, copyFileSync, mkdirSync, readdirSync, statSync } from 'fs'
import { join } from 'path'
import { ManifestGenerator } from '../manifest-generator/generator'

export interface ViteConfigOptions {
  useLocalWorkspace: boolean;
  inputPath: string;
  outputPath: string;
  watch?: boolean;
  mode?: string;
  targetDir?: string;
}

// Minimal Vite config interface
interface ViteUserConfig {
  build: {
    watch: boolean | object
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
        ['@babel/preset-env', { targets: { ie: '11' }, modules: false }]
      ],
      extensions: ['.js', '.ts']
    })
  }

  /**
   * Creates a plugin to copy assets and translations
   */
  private static createAssetCopyPlugin (inputPath: string, outputPath: string) {
    const copyDirRecursive = (src: string, dest: string) => {
      if (!existsSync(dest)) {
        mkdirSync(dest, { recursive: true })
      }

      const items = readdirSync(src)
      for (const item of items) {
        const srcPath = join(src, item)
        const destPath = join(dest, item)

        if (statSync(srcPath).isDirectory()) {
          copyDirRecursive(srcPath, destPath)
        } else {
          copyFileSync(srcPath, destPath)
        }
      }
    }

    return {
      name: 'copy-assets-translations',
      writeBundle () {
        // Copy assets
        const assetsDir = join(inputPath, 'src/assets')
        if (existsSync(assetsDir)) {
          const targetAssetsDir = join(outputPath, 'assets')
          copyDirRecursive(assetsDir, targetAssetsDir)
        }

        // Copy translations
        const translationsDir = join(inputPath, 'src/translations')
        if (existsSync(translationsDir)) {
          const targetTranslationsDir = join(outputPath, 'translations')
          copyDirRecursive(translationsDir, targetTranslationsDir)
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
            const copyDirRecursive = (src: string, dest: string) => {
              if (!existsSync(dest)) {
                mkdirSync(dest, { recursive: true })
              }

              const items = readdirSync(src)
              for (const item of items) {
                const srcPath = join(src, item)
                const destPath = join(dest, item)

                if (statSync(srcPath).isDirectory()) {
                  copyDirRecursive(srcPath, destPath)
                } else {
                  copyFileSync(srcPath, destPath)
                }
              }
            }
            copyDirRecursive(outputPath, targetDir)
          }
        } catch (error) {
          console.error('Failed to generate manifest:', error)
          throw error
        }
      }
    }
  }

  private static createBaseConfig (
    outputPath: string,
    plugins: any[],
    externalFn: (id: string) => boolean,
    watch?: boolean
  ): ViteUserConfig {
    return {
      build: {
        watch: watch ? {} : false,
        target: 'es2015',
        lib: {
          entry: 'src/index.ts',
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
    const { inputPath, outputPath, mode, targetDir } = options

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

    const external = (id: string) => {
      if (id.includes('@zendesk/connector-sdk') || id.includes('core')) {
        return false
      }

      return !id.startsWith('.') && !id.startsWith('/') && !id.includes('\\')
    }

    return this.createBaseConfig(outputPath, plugins, external, options.watch)
  }

  private static createNpmConfig (options: ViteConfigOptions): ViteUserConfig {
    const { inputPath, outputPath, mode, targetDir } = options
    // For npm mode, we only need babel - no nodeResolve or commonjs
    const plugins = [
      this.createBabelPlugin(),
      this.createAssetCopyPlugin(inputPath, outputPath),
      this.createManifestPlugin(outputPath, mode, targetDir)
    ]

    const external = (id: string) => {
      if (id.includes('@zendesk/connector-sdk') || id.includes('core')) {
        return false
      }

      return !id.startsWith('.') && !id.startsWith('/') && !id.includes('\\')
    }

    return this.createBaseConfig(outputPath, plugins, external, options.watch)
  }

  /**
   * Main config creation method - uses flag to determine which config to use
   */
  static createConfig (
    options: ViteConfigOptions,
    logger: { log: (message: string) => void }
  ): ViteUserConfig {
    const useLocal = options.useLocalWorkspace === true

    if (useLocal) {
      logger.log('[ViteConfigBuilder] Using local workspace configuration')
      return this.createLocalConfig(options)
    } else {
      logger.log(
        '[ViteConfigBuilder] Using npm registry configuration (default)'
      )
      return this.createNpmConfig(options)
    }
  }
}

// Export a helper function to create Vite config
export function createConnectorViteConfig (
  options: ViteConfigOptions,
  logger: { log: (message: string) => void }
): ViteUserConfig {
  return ViteConfigBuilder.createConfig(options, logger)
}
