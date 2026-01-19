import { writeFileSync, existsSync, realpathSync } from 'fs'
import { join, resolve, normalize } from 'path'

import {
  ConnectorConfig,
  ManifestData,
  ManifestGeneratorOptions
} from './types'

const DEFAULT_VERSION = '1.0.0'
const DEFAULT_LOCALE = 'en-US'
const CORE_PACKAGE_FALLBACK_VERSION = '1.0.0'
export class ManifestGenerator {
  static async generateManifest (
    options: ManifestGeneratorOptions
  ): Promise<void> {
    const { outputPath } = options

    const connector = await this.loadConnector(outputPath)
    this.validateConnector(connector)

    const manifest: ManifestData = {
      name: connector.name,
      title: connector.title,
      description: connector.description,
      author: connector.author,
      version: connector.version || DEFAULT_VERSION,
      platform_version:
        connector.platform_version || CORE_PACKAGE_FALLBACK_VERSION,
      default_locale: DEFAULT_LOCALE,
      metadata: connector.metadata || {
        connection_type: connector.name
      }
    }

    this.writeManifestFile(manifest, outputPath)
  }

  private static async loadConnector (
    outputPath: string
  ): Promise<ConnectorConfig> {
    const normalizedOutputPath = normalize(resolve(outputPath))
    const indexPath = join(normalizedOutputPath, 'connector.js')

    const resolvedIndexPath = resolve(indexPath)
    const resolvedOutputPath = resolve(normalizedOutputPath)

    if (!resolvedIndexPath.startsWith(resolvedOutputPath + '/') &&
        resolvedIndexPath !== join(resolvedOutputPath, 'connector.js')) {
      throw new Error(
        `Security violation: Attempted to load file outside of output directory. Path: ${indexPath}`
      )
    }

    if (!existsSync(resolvedIndexPath)) {
      throw new Error(
        `Connector file not found at ${resolvedIndexPath}. Please ensure the connector has been built successfully.`
      )
    }

    let realIndexPath: string
    try {
      realIndexPath = realpathSync(resolvedIndexPath)
      if (!realIndexPath.startsWith(resolvedOutputPath + '/') &&
          realIndexPath !== join(resolvedOutputPath, 'connector.js')) {
        throw new Error(
          `Security violation: Real path of connector file is outside output directory. Real path: ${realIndexPath}`
        )
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('Security violation')) {
        throw error
      }
      throw new Error(
        `Failed to resolve real path for ${resolvedIndexPath}: ${error instanceof Error ? error.message : String(error)}`
      )
    }

    try {
      // Clear module cache to ensure fresh loading
      delete require.cache[require.resolve(realIndexPath)]

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const connectorModule = require(realIndexPath)

      // Handle both CommonJS (exports.default) and direct exports
      const connector = connectorModule.default || connectorModule

      if (!connector || typeof connector !== 'object') {
        throw new Error(
          `Invalid connector module at ${realIndexPath}. Expected an object but got ${typeof connector}.`
        )
      }

      return connector
    } catch (error) {
      if (error instanceof Error) {
        // Re-throw our custom errors as-is
        if (error.message.includes('Connector file not found') ||
            error.message.includes('Invalid connector module') ||
            error.message.includes('Security violation')) {
          throw error
        }
        // Wrap other errors with more context
        throw new Error(
          `Failed to load connector from ${realIndexPath}: ${error.message}`
        )
      }
      // Handle non-Error objects
      throw new Error(
        `Failed to load connector from ${realIndexPath}: ${String(error)}`
      )
    }
  }

  private static writeManifestFile (
    manifest: ManifestData,
    outputPath: string
  ): void {
    const manifestPath = join(outputPath, 'manifest.json')
    const manifestContent = JSON.stringify(manifest, null, 2)
    writeFileSync(manifestPath, manifestContent, 'utf-8')
  }

  private static validateConnector (connector: ConnectorConfig): void {
    const requiredProperties: (keyof ConnectorConfig)[] = [
      'name',
      'title',
      'description'
    ]

    const missingProperties = requiredProperties.filter(
      prop => !connector[prop]
    )

    if (missingProperties.length > 0) {
      throw new Error(
        `Connector is missing required properties: ${missingProperties.join(', ')}`
      )
    }
  }
}
