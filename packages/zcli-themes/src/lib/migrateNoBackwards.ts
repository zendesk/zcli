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
  updateDocumentHeadTemplate(themePath, newDir)
  updateHomePageTemplate(themePath, newDir)
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
  const additionalModuleFilePath = path.join(__dirname, '..', 'templates', 'request_form_script.hbs')

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
    throw new CLIError(chalk.red(`file was malformed at path: "${updatedTemplateFilePath}"`))
  }
}

function updateDocumentHeadTemplate (themePath: string, updatedThemePath: string): void {
  const templateFilePath = `${themePath}/templates/document_head.hbs`
  const updatedTemplatesPath = `${updatedThemePath}/templates`
  const updatedTemplateFilePath = `${updatedTemplatesPath}/document_head.hbs`
  const additionalScriptsFilePath = path.join(__dirname, '..', 'templates', 'document_head_scripts.hbs')

  try {
    if (!fs.existsSync(updatedTemplatesPath)) {
      fs.mkdirSync(updatedTemplatesPath)
    }

    const templateFile = fs.readFileSync(templateFilePath, 'utf-8')
    const additionalModule = fs.readFileSync(additionalScriptsFilePath, 'utf-8')
    fs.writeFileSync(updatedTemplateFilePath, templateFile + additionalModule, { flag: 'w' })
  } catch (error) {
    throw new CLIError(chalk.red(`file was malformed at path: "${updatedTemplateFilePath}"`))
  }
}

function updateHomePageTemplate (themePath: string, updatedThemePath: string): void {
  const templateFilePath = `${themePath}/templates/home_page.hbs`
  const updatedTemplatesPath = `${updatedThemePath}/templates`
  const updatedTemplateFilePath = `${updatedTemplatesPath}/home_page.hbs`

  try {
    if (!fs.existsSync(updatedTemplatesPath)) {
      fs.mkdirSync(updatedTemplatesPath)
    }

    const templateFile = fs.readFileSync(templateFilePath, 'utf-8')

    const patternsToRemove = [
      // Articles patterns
      /({{#each categories}}[\s\S]*?)({{#each articles}}[\s\S]*?{{\/each}})([\s\S]*{{\/each}})/g,
      /({{#each categories}}[\s\S]*?)({{#each [\S]*?\.articles}}[\s\S]*?{{\/each}})([\s\S]*{{\/each}})/g,
      /({{#each categories}}[\s\S]*?)({{#with articles}}[\s\S]*?{{\/with}})([\s\S]*{{\/each}})/g,
      /({{#each categories}}[\s\S]*?)({{#with [\S]*?\.articles}}[\s\S]*?{{\/with}})([\s\S]*{{\/each}})/g,
      /({{#each categories}}[\s\S]*?)({{articles}})([\s\S]*{{\/each}})/g,
      /({{#each categories}}[\s\S]*?)({{[\S]*?\.articles}})([\s\S]*{{\/each}})/g,
      // Articles count patterns
      /({{#each categories}}[\s\S]*?)({{#each articles_count}}[\s\S]*?{{\/each}})([\s\S]*{{\/each}})/g,
      /({{#each categories}}[\s\S]*?)({{#each [\S]*?\.articles_count}}[\s\S]*?{{\/each}})([\s\S]*{{\/each}})/g,
      /({{#each categories}}[\s\S]*?)({{#with articles_count}}[\s\S]*?{{\/with}})([\s\S]*{{\/each}})/g,
      /({{#each categories}}[\s\S]*?)({{#with [\S]*?\.articles_count}}[\s\S]*?{{\/with}})([\s\S]*{{\/each}})/g,
      /({{#each categories}}[\s\S]*?)({{articles_count}})([\s\S]*{{\/each}})/g,
      /({{#each categories}}[\s\S]*?)({{[\S]*?\.articles_count}})([\s\S]*{{\/each}})/g,
      // More articles patterns
      /({{#each categories}}[\s\S]*?)({{#each more_articles}}[\s\S]*?{{\/each}})([\s\S]*{{\/each}})/g,
      /({{#each categories}}[\s\S]*?)({{#each [\S]*?\.more_articles}}[\s\S]*?{{\/each}})([\s\S]*{{\/each}})/g,
      /({{#each categories}}[\s\S]*?)({{#with more_articles}}[\s\S]*?{{\/with}})([\s\S]*{{\/each}})/g,
      /({{#each categories}}[\s\S]*?)({{#with [\S]*?\.more_articles}}[\s\S]*?{{\/with}})([\s\S]*{{\/each}})/g,
      /({{#each categories}}[\s\S]*?)({{more_articles}})([\s\S]*{{\/each}})/g,
      /({{#each categories}}[\s\S]*?)({{[\S]*?\.more_articles}})([\s\S]*{{\/each}})/g
    ]

    let updatedFile = templateFile

    patternsToRemove.forEach(element => {
      updatedFile = replaceRecursive(updatedFile, element, updatedFile.match(element) !== null)
    })

    fs.writeFileSync(updatedTemplateFilePath, updatedFile, { flag: 'w' })
  } catch (error) {
    throw new CLIError(chalk.red(`file was malformed at path: "${updatedTemplateFilePath}"`))
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
