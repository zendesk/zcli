import { existsSync, readdirSync, statSync } from 'fs'
import { join, extname, basename } from 'path'
import * as chalk from 'chalk'
import type { ValidationContext } from './index'

const ALLOWED_ASSET_EXTENSIONS = [
  '.svg'
]

const MAX_ASSET_SIZE_KB = 5
const MAX_TOTAL_ASSETS_SIZE_KB = 5

export function validateAssets (context: ValidationContext): void {
  const { inputPath, options, log } = context

  if (options.verbose) {
    log(chalk.cyan('  → Validating assets and resources...'))
  }

  try {
    const assetsPath = join(inputPath, 'assets')
    if (existsSync(assetsPath)) {
      validateAssetsDirectory(assetsPath, options, log)
    }

    if (options.verbose) {
      log(chalk.cyan('  ✓ Assets and resources validation passed'))
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    throw new Error(`Assets validation failed: ${errorMessage}`)
  }
}

function validateAssetsDirectory (
  assetsPath: string,
  options: { verbose: boolean },
  log: (message: string) => void
): void {
  const assets = getAllFiles(assetsPath)
  let totalSizeBytes = 0

  if (options.verbose) {
    log(chalk.cyan(`    → Found ${assets.length} asset file(s) including subdirectories`))
  }

  if (assets.length === 0) {
    throw new Error('Assets directory must contain a logo file')
  }

  if (assets.length > 1) {
    throw new Error(`Assets directory must contain only one logo file, but found ${assets.length} files (including subdirectories)`)
  }

  for (const assetPath of assets) {
    const ext = extname(assetPath).toLowerCase()
    if (!ALLOWED_ASSET_EXTENSIONS.includes(ext)) {
      throw new Error(`Asset file '${assetPath}' has unsupported extension '${ext}'. Supported extensions: ${ALLOWED_ASSET_EXTENSIONS.join(', ')}`)
    }

    const filename = basename(assetPath, ext)
    if (filename !== 'logo') {
      throw new Error(`Logo file must be named 'logo', but found '${filename}${ext}'`)
    }

    const stats = statSync(assetPath)
    const sizeInKB = stats.size / 1024

    if (sizeInKB > MAX_ASSET_SIZE_KB) {
      throw new Error(`Asset file '${assetPath}' is too large (${sizeInKB.toFixed(2)}KB). Maximum allowed: ${MAX_ASSET_SIZE_KB}KB`)
    }

    totalSizeBytes += stats.size
  }

  const totalSizeInKB = totalSizeBytes / 1024
  if (totalSizeInKB > MAX_TOTAL_ASSETS_SIZE_KB) {
    throw new Error(`Total assets size (${totalSizeInKB.toFixed(2)}KB) exceeds maximum allowed (${MAX_TOTAL_ASSETS_SIZE_KB}KB)`)
  }

  if (options.verbose && assets.length > 0) {
    log(chalk.cyan(`    ✓ Logo file validated (${totalSizeInKB.toFixed(2)}KB)`))
  }
}

function getAllFiles (dirPath: string): string[] {
  const files: string[] = []

  function traverseDirectory (currentPath: string) {
    const items = readdirSync(currentPath)

    for (const item of items) {
      const itemPath = join(currentPath, item)
      const stats = statSync(itemPath)

      if (stats.isDirectory()) {
        traverseDirectory(itemPath)
      } else {
        files.push(itemPath)
      }
    }
  }

  traverseDirectory(dirPath)
  return files
}
