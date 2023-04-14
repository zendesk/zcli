import { globSync } from 'glob'
import * as fs from 'fs'

export default function getTemplates (themePath: string): Record<string, string> {
  const templates: Record<string, string> = {}
  const filenames = globSync(`${themePath}/templates/**/*.hbs`)

  filenames.forEach((template) => {
    const identifier = template.split('templates/')[1].split('.hbs')[0]
    const source = fs.readFileSync(template, 'utf8')
    templates[identifier] = source
  })

  return templates
}
