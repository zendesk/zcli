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

const SYSTEM_FILE_SUFFIXES = [
  '~',
  '.swp',
  '.swo',
  '.tmp',
  '.bak'
]

/**
 * Returns true when the given file or directory name is a hidden/system
 * artifact that should be ignored during bundling and validation.
 *
 * Covers:
 * - dotfiles and dot-directories (`.DS_Store`, `.localized`, `.git`, ...)
 * - AppleDouble files (`._logo.svg`)
 * - well-known Windows system files (`Thumbs.db`, `ehthumbs.db`, `desktop.ini`)
 * - editor artifacts: Emacs autosave (`#file#`), backup (`file~`),
 *   swap (`file.swp`, `file.swo`) and temp (`file.tmp`, `file.bak`) files
 */
export function isSystemFile (name: string): boolean {
  if (!name) {
    return false
  }

  // Dotfiles and dot-directories (.DS_Store, .localized, ._AppleDouble, ...)
  if (name.startsWith('.')) {
    return true
  }

  // Emacs autosave files (#file#)
  if (name.length > 1 && name.startsWith('#') && name.endsWith('#')) {
    return true
  }

  const lowerName = name.toLowerCase()

  if (SYSTEM_FILE_NAMES.has(lowerName)) {
    return true
  }

  // Backup, swap and temp files (file~, file.swp, file.tmp, ...)
  return SYSTEM_FILE_SUFFIXES.some(suffix => lowerName.endsWith(suffix))
}
