import type { Flags } from '../types'
import { CLIError } from '@oclif/core/lib/errors'
import * as fs from 'fs'
import * as path from 'path'

export default function getAssets (themePath: string, flags: Flags): [path.ParsedPath, string][] {
  const assetsPath = `${themePath}/assets`
  const filenames = fs.existsSync(assetsPath) ? fs.readdirSync(assetsPath) : []
  const assets: [path.ParsedPath, string][] = []
  const { bind: host, port } = flags

  filenames.forEach(filename => {
    const parsedPath = path.parse(filename)
    const name = parsedPath.name.toLowerCase()
    if (name.match(/[^a-z0-9-_+.]/)) {
      throw new CLIError(
        `The asset "${filename}" has illegal characters in its name. Filenames should only have alpha-numerical characters, ., _, -, and +`
      )
    }
    if (!name.startsWith('.')) {
      assets.push([parsedPath, `http://${host}:${port}/guide/assets/${filename}`])
    }
  })

  return assets
}
