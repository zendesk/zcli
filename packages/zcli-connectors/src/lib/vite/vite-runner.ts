export class ViteRunner {
  static async run (config: any): Promise<{
    hasErrors: () => boolean;
    hasWarnings: () => boolean;
    toJson: () => any;
  }> {
    try {
      // Dynamic import to avoid requiring vite at startup
      const { build } = await import('vite')

      // Capture Rollup warnings so callers can report them. Vite logs them
      // via its own logger, but the returned BuildResult used to always
      // claim zero warnings, which hid e.g. unexpected bundle files skipped
      // by the asset copy plugin (VEG-4556).
      const warnings: { message: string }[] = []
      const configWithWarningCapture = {
        ...config,
        build: {
          ...config?.build,
          rollupOptions: {
            ...config?.build?.rollupOptions,
            onwarn: (warning: any, defaultHandler?: (warning: any) => void) => {
              warnings.push({ message: warning?.message ?? String(warning) })
              if (defaultHandler) {
                defaultHandler(warning)
              }
            }
          }
        }
      }

      await build(configWithWarningCapture)

      return {
        hasErrors: () => false, // Vite throws on errors, so if we reach here, no errors
        hasWarnings: () => warnings.length > 0,
        toJson: () => ({
          errors: [],
          warnings,
          assets: []
        })
      }
    } catch (error) {
      console.error('Vite build failed:', error)

      // Return error stats
      return {
        hasErrors: () => true,
        hasWarnings: () => false,
        toJson: () => ({
          errors: [
            { message: error instanceof Error ? error.message : String(error) }
          ],
          warnings: [],
          assets: []
        })
      }
    }
  }
}
