export type Flags = {
  help?: string,
  bind: string,
  port: number,
  logs: boolean,
  livereload: boolean,
}

export type Variable = {
  identifier: string,
  type: string,
  value?: string | boolean | number
}

export type Setting = {
  variables: Variable[]
}

export type Manifest = {
  api_version: number,
  settings: Setting[]
}

type TemplateError = {
  description: string,
  line: number,
  column: number,
  length: number
}

export type TemplateErrors = {
  [key: string]: TemplateError[]
}
