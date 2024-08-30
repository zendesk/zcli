import * as path from 'path'
import * as fs from 'fs'
import type { Manifest } from '../types'
import * as chalk from 'chalk'
import { CLIError } from '@oclif/core/lib/errors'

export default function migrateNoBackwards (themePath: string, manifest: Manifest): void {
  const newDir = themePath + '/updated-theme'

  if (!fs.existsSync(newDir)) {
    fs.mkdirSync(newDir)
  }

  updateOrCreateManifest(newDir, manifest)
  updateNewRequestTemplate(themePath, newDir)
}

function updateOrCreateManifest (themePath: string, manifestContent: Manifest): void {
  const updated_manifest = manifestContent
  updated_manifest.api_version = 4

  const manifestFilePath = `${themePath}/manifest.json`

  try {
    fs.writeFileSync(manifestFilePath, JSON.stringify(updated_manifest, null, 2), { flag: 'w' })
  } catch (error) {
    throw new CLIError(chalk.red(`manifest.json file was malformed at path: "${manifestFilePath}"`))
  }
}

function updateNewRequestTemplate (themePath: string, updatedThemePath: string): void {
  const templateFilePath = `${themePath}/templates/new_request_page.hbs`
  const updatedTemplatesPath = `${updatedThemePath}/templates`
  const updatedTemplateFilePath = `${updatedTemplatesPath}/new_request_page.hbs`
  const additionalModuleFilePath = path.join(__dirname, '..', 'templates', 'request_form_module.hbs')

  try {
    if (!fs.existsSync(updatedTemplatesPath)) {
      fs.mkdirSync(updatedTemplatesPath)
    }

    const templateFile = fs.readFileSync(templateFilePath, 'utf-8')
    let updatedFile = templateFile.replace(/\n\s*<span class="follow-up-hint"[^>]*>([\s\S]*?)<\/span>/g, '')
    updatedFile = updatedFile.replace(/{{request_form .*}}/g, '<div id="new-request-form"></div>')

    const additionalModule = fs.readFileSync(additionalModuleFilePath, 'utf-8')
    fs.writeFileSync(updatedTemplateFilePath, updatedFile + additionalModule, { flag: 'w' })
  } catch (error) {
    console.log(error)
    throw new CLIError(chalk.red(`manifest.json file was malformed at path: "${templateFilePath}"`))
  }
}
