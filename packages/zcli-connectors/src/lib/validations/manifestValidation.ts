import { readFileSync } from 'fs'
import { join } from 'path'
import * as chalk from 'chalk'
import { valid as isValidSemver } from 'semver'
import type { ValidationContext } from './index'
import { SUPPORTED_LOCALES } from '../../constants'

interface ConnectorManifest {
  name?: string
  title?: string
  version?: string
  author?: string
  platform_version?: string
  default_locale?: string
  metadata?: {
    connection_type?: string
    [key: string]: any
  }
  [key: string]: any
}

export function validateManifest (context: ValidationContext): void {
  const { inputPath, options, log } = context
  const manifestPath = join(inputPath, 'manifest.json')

  if (options.verbose) {
    log(chalk.cyan('  → Validating manifest.json...'))
  }

  try {
    const manifestContent = readFileSync(manifestPath, 'utf-8')
    const manifest: ConnectorManifest = JSON.parse(manifestContent)

    validateRequiredFields(manifest)
    validateFieldValues(manifest)

    if (options.verbose) {
      log(chalk.cyan('  ✓ Manifest schema validation passed'))
    }
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(
        `Manifest file is not valid JSON: ${error.message}`
      )
    }
    const errorMessage = error instanceof Error ? error.message : String(error)
    throw new Error(`Manifest validation failed: ${errorMessage}. Update the manifest definition and re-run the bundle command.`)
  }
}

function validateRequiredFields (manifest: ConnectorManifest): void {
  const requiredFields = ['name', 'title', 'author', 'version', 'platform_version', 'default_locale', 'metadata']
  const missingFields: string[] = []

  for (const field of requiredFields) {
    if (manifest[field] === undefined || manifest[field] === null) {
      missingFields.push(field)
    }
  }

  if (missingFields.length > 0) {
    throw new Error(`Missing required fields: ${missingFields.join(', ')}`)
  }
}

function validateFieldValues (manifest: ConnectorManifest): void {
  if (typeof manifest.name !== 'string') {
    throw new Error('Connector name must be a string')
  }
  if (manifest.name.length < 3 || manifest.name.length > 128) {
    throw new Error(`Connector name must be 3-128 characters long (the connector's name has ${manifest.name.length} characters)`)
  }
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(manifest.name)) {
    throw new Error('Connector name must contain only lowercase letters, numbers, and hyphens (e.g., "my-connector")')
  }

  if (typeof manifest.title !== 'string') {
    throw new Error('Title must be a string')
  }
  if (manifest.title.length < 3 || manifest.title.length > 128) {
    throw new Error(`Title must be 3-128 characters long (the connector's title has ${manifest.title.length} characters)`)
  }

  if (typeof manifest.author !== 'string') {
    throw new Error('Author must be a string')
  }
  if (manifest.author.length < 1 || manifest.author.length > 128) {
    throw new Error(`Author must be 1-128 characters long (the connector's author has ${manifest.author.length} characters)`)
  }

  if (typeof manifest.version !== 'string') {
    throw new Error('Version must be a string')
  }
  if (!isValidSemver(manifest.version)) {
    throw new Error(`Version '${manifest.version}' is not valid. Use semantic versioning like 1.2.3 or 1.0.0-beta.1`)
  }

  if (typeof manifest.platform_version !== 'string') {
    throw new Error('Platform version must be a string')
  }
  if (manifest.platform_version !== '1.0.0') {
    throw new Error('Platform version must be "1.0.0"')
  }

  if (typeof manifest.default_locale !== 'string') {
    throw new Error('Default locale must be a string')
  }
  const normalizedLocale = manifest.default_locale.toLowerCase()
  if (!SUPPORTED_LOCALES.includes(normalizedLocale)) {
    throw new Error(`Default locale '${manifest.default_locale}' is not supported. See https://support.zendesk.com/hc/en-us/articles/4408821324826-Zendesk-language-support-by-product for supported locales.`)
  }

  if (typeof manifest.metadata !== 'object' || Array.isArray(manifest.metadata)) {
    throw new Error('Field "metadata" must be an object')
  }

  if (manifest.metadata.connection_type !== undefined) {
    if (typeof manifest.metadata.connection_type !== 'string') {
      throw new Error('Metadata connection_type must be a string')
    }

    if (manifest.metadata.connection_type === '') {
      throw new Error('Metadata connection_type must be a non-empty string')
    }

    if (manifest.metadata.connection_type === 'zendesk') {
      throw new Error('Metadata connection_type cannot be "zendesk"')
    }
  }
}
