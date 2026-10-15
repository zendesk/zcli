/**
 * Helpers for detecting hidden/system files that operating systems and
 * editors create automatically (e.g. macOS Finder's `.DS_Store`).
 *
 * These files must never be bundled into or validated as part of a
 * connector package — see VEG-4556.
 */

const SYSTEM_FILE_NAMES = new Set([
  'thumbs.db',
  'ehthumbs.db',
  'desktop.ini'
])

/**
 * Returns true when the given file or directory name is a hidden/system
 * artifact that should be ignored during bundling and validation.
 *
 * Covers:
 * - dotfiles and dot-directories (`.DS_Store`, `.localized`, `.swp`, ...)
 * - AppleDouble files (`._logo.svg`)
 * - well-known Windows system files (`Thumbs.db`, `desktop.ini`, ...)
 */
export function isSystemFile (name: string): boolean {
  if (!name) {
    return false
  }

  // Dotfiles and dot-directories (.DS_Store, .localized, ._AppleDouble, ...)
  if (name.startsWith('.')) {
    return true
  }

  return SYSTEM_FILE_NAMES.has(name.toLowerCase())
}
