import type { Variable } from '../types'
import * as path from 'path'
import * as sass from 'sass'

// Help Center themes may use SASS variable syntax to access variables
// defined in the manifest.json file and also the URLs of files placed
// in the assets folder. Read more about it in the article:
// https://support.zendesk.com/hc/en-us/articles/4408846524954-Customizing-the-Settings-panel#using-settings-in-manifest-json-as-variables
// Apart from variable syntax, we also also 'lighten' and 'darken' functions
export default function zass (source: string, variables: Variable[], assets: [path.ParsedPath, string][]) {
  let output

  try {
    // Escape theme variables and supported functions
    const escaped = source
      .replace(/\$/g, '\\$') // escape variables
      .replace(/lighten/g, '\\\\lighten') // escape 'lighten' function
      .replace(/darken/g, '\\\\darken') // escape 'darken' function

    // Validate CSS does not include unsupported SASS features
    output = sass.compileString(escaped, {
      // syntax: 'css' is plain CSS, which is parsed like SCSS but forbids the use of any special Sass features:
      // https://sass-lang.com/documentation/js-api/modules#Syntax
      syntax: 'css'
    })
  } catch {
    // not supported
    output = source
  } finally {
    // safe to compile as SCSS
    const manifestVariable = variables
      .map((variable) => `$${variable.identifier}: ${variable.type === 'file' ? `"${variable.value}"` : variable.value};`)
      .join('\n')

    const assetVariables = assets.map(([parsedPath, url]) => {
      const name = parsedPath.name.replace(/\+/g, '-')
      const extension = parsedPath.ext.split('.').pop()
      return `$assets-${name}-${extension}: "${url}";`
    }).join('\n')

    output = sass.compileString(manifestVariable + assetVariables + source, {
      syntax: 'scss'
    }).css
  }

  return output
}
