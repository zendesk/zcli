import { ViteConfigBuilder } from './vite-config'

export class ViteRunner {
  static async run (config: any): Promise<{
    hasErrors: () => boolean;
    hasWarnings: () => boolean;
    toJson: () => any;
  }> {
    try {
      // Dynamic import to avoid requiring vite at startup
      const { build } = await import('vite')

      await build(config)

      return {
        hasErrors: () => false, // Vite throws on errors, so if we reach here, no errors
        hasWarnings: () => false,
        toJson: () => ({
          errors: [],
          warnings: [],
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

export { ViteConfigBuilder }
