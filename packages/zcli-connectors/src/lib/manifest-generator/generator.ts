import { writeFileSync } from 'fs'
import { join } from 'path'

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
    const indexPath = join(outputPath, 'connector.js')

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const connectorModule = require(indexPath)

    // Handle both CommonJS (exports.default) and direct exports
    return connectorModule.default || connectorModule
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
