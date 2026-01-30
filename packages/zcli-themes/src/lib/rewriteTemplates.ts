import * as fs from 'fs'

export default function rewriteTemplates (themePath: string, templates: Record<string, string>) {
  for (const [identifier, content] of Object.entries(templates)) {
    const filePath = `${themePath}/templates/${identifier}.hbs`

    if (typeof content === 'string') {
      try {
        fs.writeFileSync(filePath, content)
      } catch (error) {
        // Ignore errors if file doesn't exist or can't be written
      }
    }
  }
}
