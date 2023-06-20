import type { Variable } from '../types'
import * as path from 'path'
import * as sass from 'sass'

// Help Center themes may use SASS variable syntax to access variables
// defined in the manifest.json file and also the URLs of files placed
// in the assets folder. Read more about it in the article:
// https://support.zendesk.com/hc/en-us/articles/4408846524954-Customizing-the-Settings-panel#using-settings-in-manifest-json-as-variables
// Apart from variable syntax, we also also support 'lighten' and 'darken' functions
export default function zass (source: string, variables: Variable[], assets: [path.ParsedPath, string][]) {
  let output = source

  const replacements: Record<Variable['identifier'], Variable['value']> = {}
  const identifiers = variables.map(({ identifier }) => identifier)

  // variables from settings in the `manifest.json` file
  for (const { identifier, value } of variables) {
    replacements[`$${identifier}`] = value // suport default variable sytax, e.g. `$name`
    replacements[`#{$${identifier}}`] = value // suport (undocumented) interpolation, e.g. `#{$name}`
  }

  // variables from files in the `assets` folder
  for (const [parsedPath, url] of assets) {
    const name = parsedPath.name.replace(/\+/g, '-')
    const extension = parsedPath.ext.split('.').pop()
    const identifier = `assets-${name}-${extension}`
    replacements[`$${identifier}`] = url
    // make sure to add all asset identifiers before
    // composing the regular expression
    identifiers.push(identifier)
  }

  const groups = `(${identifiers.join('|')})`
  const variablesRegex = new RegExp(`(\\$${groups}\\b)|(#\\{\\$${groups}\\})`, 'g')

  // First replace all variables and interpolated variables
  output = output.replace(variablesRegex, (match) => {
    return (replacements[match] || match).toString()
  })

  const command = /(?<command>lighten|darken)/i
  const percentage = /(?<percentage>\d{1,3})%/
  const functionsRegex = new RegExp(`${command.source}\\s*\\((?<color>.*),\\s*${percentage.source}\\s*\\)`)

  // `darken` and `lighten` functions may use variables so make
  // sure to replace them last
  output = output.replace(functionsRegex, (match/*, command, color, percentage */) => {
    const prefix = 'code{color:'
    const suffix = '}'

    // dart-sass does not provide an api to individually compile `darken` and `lighten`
    // so we improvise one using `compileString` with a valid SCSS string.
    // If such an api ever becomes available, we could switch to using it along with
    // the named gorups "command", "color" and "percentage"
    const compiled = sass.compileString(prefix + match + suffix, { style: 'compressed' }).css
    const value = compiled.substring(prefix.length, compiled.length - suffix.length)

    return value
  })

  return output
}
