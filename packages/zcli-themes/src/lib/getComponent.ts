import type { Component } from '../types'
import { CLIError } from '@oclif/core/lib/errors'
import * as fs from 'fs'
import * as chalk from 'chalk'

export default function getComponent (componentPath: string): Component {
  const componentFilePath = `${componentPath}/component.json`

  if (!fs.existsSync(componentFilePath)) {
    throw new CLIError(chalk.red(`Couldn't find a component.json file at path: "${componentFilePath}"`))
  }

  let component: Component
  try {
    component = JSON.parse(fs.readFileSync(componentFilePath, 'utf8'))
  } catch (error) {
    throw new CLIError(chalk.red(`component.json file was malformed at path: "${componentFilePath}"`))
  }

  if (!component.name || !component.version) {
    throw new CLIError(chalk.red(`component.json at path: "${componentFilePath}" must declare a "name" and a "version"`))
  }

  return component
}
