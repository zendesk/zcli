export type Config = {
  subdomain: string,
  username: string,
  password: string
}

export type Flags = {
  help?: string,
  bind: string,
  port: number,
  logs: boolean,
  subdomain?: string,
  username?: string,
  password?: string
}

export type RuntimeContext = Config & Flags & {
  origin: string,
  host: string
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
