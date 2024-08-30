import * as path from 'path'
import * as fs from 'fs'
import { globSync } from 'glob'
import getManifest from './getManifest'
import getTemplates from './getTemplates'

export default async function migrate (themePath: string): Promise<string | void> {
  migrateManifest(themePath)
  migrateTemplates(themePath)
}

function migrateManifest (themePath: string) {
  const manifest = getManifest(themePath)

  manifest.api_version = 4

  fs.writeFileSync(`${themePath}/manifest.json`, JSON.stringify(manifest, null, 2) + '\n')
}

function migrateTemplates (themePath: string) {
  const templates = getTemplates(themePath)
  const macrosPath = path.join(__dirname, '..', '..', 'macros')

  for (const dentifier of Object.keys(templates)) {
    let template = templates[dentifier]
    const macros = globSync(`${macrosPath}/${dentifier}/*.hbs`.replace(/\\/g, '/'), { posix: true })

    for (const macro of macros) {
      const source = fs.readFileSync(macro, 'utf8')
      const { name: helper } = path.parse(macro)
      template = template.replace(new RegExp(`{{${helper}.*}}`), source)
    }

    fs.writeFileSync(`${themePath}/templates/${dentifier}.hbs`, template)
  }
}
