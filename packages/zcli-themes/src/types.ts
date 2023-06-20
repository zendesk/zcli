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

export type ValidationError = {
  description: string,
  line?: number,
  column?: number,
  length?: number
}

export type ValidationErrors = {
  [path: `templates/${string}.hbs`]: ValidationError[]
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
