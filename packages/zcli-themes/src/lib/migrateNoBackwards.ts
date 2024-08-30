import * as path from 'path'
import * as fs from 'fs'
import type { Manifest } from '../types'
import * as chalk from 'chalk'
import { CLIError } from '@oclif/core/lib/errors'

export default function migrateNoBackwards (themePath: string, manifest: Manifest): void {
  updateOrCreateManifest(themePath, manifest)
  updateNewRequestTemplate(themePath)
  updateDocumentHeadTemplate(themePath)
  updateHomePageTemplate(themePath)
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

function updateNewRequestTemplate (themePath: string): void {
  const templateFilePath = `${themePath}/templates/new_request_page.hbs`
  const additionalModuleFilePath = path.join(__dirname, '..', 'templates', 'request_form_script.hbs')

  try {
    const templateFile = fs.readFileSync(templateFilePath, 'utf-8')
    let updatedFile = templateFile.replace(/\n\s*<span class="follow-up-hint"[^>]*>([\s\S]*?)<\/span>/g, '')
    updatedFile = updatedFile.replace(/{{request_form .*}}/g, '<div id="new-request-form"></div>')

    const additionalModule = fs.readFileSync(additionalModuleFilePath, 'utf-8')
    fs.writeFileSync(templateFilePath, updatedFile + additionalModule, { flag: 'w' })
  } catch (error) {
    throw new CLIError(chalk.red(`file was malformed at path: "${templateFilePath}"`))
  }
}

function updateDocumentHeadTemplate (themePath: string): void {
  const templateFilePath = `${themePath}/templates/document_head.hbs`
  const additionalScriptsFilePath = path.join(__dirname, '..', 'templates', 'document_head_scripts.hbs')

  try {
    const templateFile = fs.readFileSync(templateFilePath, 'utf-8')
    const additionalModule = fs.readFileSync(additionalScriptsFilePath, 'utf-8')
    fs.writeFileSync(templateFilePath, templateFile + additionalModule, { flag: 'w' })
  } catch (error) {
    throw new CLIError(chalk.red(`file was malformed at path: "${templateFilePath}"`))
  }
}

function updateHomePageTemplate (themePath: string): void {
  const templateFilePath = `${themePath}/templates/home_page.hbs`

  try {
    const templateFile = fs.readFileSync(templateFilePath, 'utf-8')

    const patternsToRemove = [
      // Articles patterns
      /({{#each categories}}[\s\S]*?)({{#each (?:articles|articles_count|more_articles)}}[\s\S]*?{{\/each}})([\s\S]*{{\/each}})/g,
      /({{#each categories}}[\s\S]*?)({{#each [\S]*?\.(?:articles|articles_count|more_articles)}}[\s\S]*?{{\/each}})([\s\S]*{{\/each}})/g,
      /({{#each categories}}[\s\S]*?)({{#with (?:articles|articles_count|more_articles)}}[\s\S]*?{{\/with}})([\s\S]*{{\/each}})/g,
      /({{#each categories}}[\s\S]*?)({{#with [\S]*?\.(?:articles|articles_count|more_articles)}}[\s\S]*?{{\/with}})([\s\S]*{{\/each}})/g,
      /({{#each categories}}[\s\S]*?)({{(?:articles|articles_count|more_articles)}})([\s\S]*{{\/each}})/g,
      /({{#each categories}}[\s\S]*?)({{[\S]*?\.(?:articles|articles_count|more_articles)}})([\s\S]*{{\/each}})/g
    ]

    let updatedFile = templateFile

    patternsToRemove.forEach(element => {
      updatedFile = replaceRecursive(updatedFile, element, updatedFile.match(element) !== null)
    })

    fs.writeFileSync(templateFilePath, updatedFile, { flag: 'w' })
  } catch (error) {
    throw new CLIError(chalk.red(`file was malformed at path: "${templateFilePath}"`))
  }
}

function replaceRecursive (templateFile: string, pattern: RegExp, match: boolean): string {
  if (match) {
    const updatedFile = templateFile.replace(pattern, '$1$3')
    return replaceRecursive(updatedFile, pattern, updatedFile.match(pattern) !== null)
  } else {
    return templateFile
  }
}
