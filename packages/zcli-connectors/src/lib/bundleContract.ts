/**
 * Connector bundle file contract used when bundling and validating.
 *
 * Only files that are part of the contract are bundled into `dist/`,
 * mirroring the server-side allowlist in Flowstate
 * (`bundlefiles.IsAllowed`, see VEG-4556). Keep this in sync with the
 * server contract (tracked under VEG-4698).
 *
 * Three tiers, matching the backend behaviour:
 * - contract files are copied;
 * - operating-system metadata noise (`.DS_Store`, AppleDouble `._*`,
 *   `__MACOSX`) is silently ignored;
 * - anything else is reported as unexpected and skipped, so the
 *   behaviour is visible rather than silent.
 */

/** Operating-system metadata noise that is always safe to ignore silently. */
export function isOSMetadataEntry (name: string): boolean {
  return name === '.DS_Store' ||
    name === '__MACOSX' ||
    name.startsWith('._')
}

/** Reports whether a file name is allowed in the bundle assets directory. */
export function isAllowedAssetFile (name: string): boolean {
  return name === 'logo.svg'
}

/**
 * Reports whether a file name is allowed directly in the bundle
 * translations directory. Locale name and content validation happen
 * separately, so this checks only the file extension.
 */
export function isAllowedTranslationFile (name: string): boolean {
  return name.endsWith('.json')
}
