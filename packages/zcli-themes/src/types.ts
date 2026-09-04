export type Flags = {
  help?: string,
  bind: string,
  port: number,
  logs: boolean,
  livereload: boolean,
  'https-key'?: string,
  'https-cert'?: string
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

export type Component = {
  name: string,
  version: string,
  settings?: Setting[],
  data_requirements?: Record<string, { source: string }>
}

export type ValidationError = {
  description: string,
  line?: number,
  column?: number,
  length?: number
}

export type ValidationErrors = {
  [path: `templates/${string}.hbs`]: ValidationError[]
}

export type TemplateErrors = Record<string, ValidationError[]>

export type MigrationStrategy = 'inline' | 'partial' | 'prefix'

export type MigrationReportEntry = {
  target: string | null,
  strategy: MigrationStrategy,
  description: string,
  test_plan: string
}

export type MigrationReport = {
  [identifier: string]: MigrationReportEntry[]
}

export type MigrateResponse = {
  templates: Record<string, string>,
  metadata: { api_version: number },
  assets: Record<string, string>,
  migration_report: MigrationReport
}

export type MigrateErrorBody = {
  template_errors?: TemplateErrors,
  general_error?: string
}

export type Brand = {
  id: number,
  name: string,
}

export type JobError = {
  title: string,
  code: string,
  message: string,
  meta: object
}

type JobData = {
  theme_id: string,
  upload: {
    url: string,
    parameters: {
      [key: string]: string
    }
  }
}

export type PendingJob = {
  id: string,
  status: 'pending',
  data: JobData
}

export type CompletedJob = {
  id: string,
  status: 'completed',
  data: JobData
}

export type FailedJob = {
  id: string,
  status: 'failed',
  errors: JobError[]
}

export type Job = PendingJob | CompletedJob | FailedJob
