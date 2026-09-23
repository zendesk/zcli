import type { Flags } from '../types'
import * as express from 'express'
import * as http from 'http'
import * as https from 'https'
import * as fs from 'fs'
import * as morgan from 'morgan'
import * as chalk from 'chalk'
import * as cors from 'cors'
import { CLIError } from '@oclif/core/lib/errors'

type ServerFlags = Pick<Flags, 'bind' | 'port' | 'logs' | 'https-cert' | 'https-key'>

const logMiddleware = morgan((tokens, req, res) =>
  `${chalk.green(tokens.method(req, res))} ${tokens.url(req, res)} ${chalk.bold(tokens.status(req, res))}`
)

export function createServer (flags: ServerFlags): { app: express.Express, server: http.Server | https.Server } {
  const { logs: tailLogs, 'https-cert': httpsCert, 'https-key': httpsKey } = flags

  const app = express()
  const server = httpsCert && httpsKey
    ? https.createServer({ key: fs.readFileSync(httpsCert), cert: fs.readFileSync(httpsKey) }, app)
    : http.createServer(app)

  app.use(cors())
  tailLogs && app.use(logMiddleware)

  return { app, server }
}

export async function listen (server: http.Server | https.Server, flags: ServerFlags): Promise<void> {
  try {
    await new Promise<void>((resolve, reject) => {
      const onError = (error: Error) => reject(error)
      server.once('error', onError)
      server.listen(flags.port, flags.bind, () => {
        server.removeListener('error', onError)
        resolve()
      })
    })
  } catch (e) {
    if ((e as { code?: string }).code === 'EADDRINUSE') {
      throw new CLIError(`Port ${flags.port} is already in use — another preview session may be running. Pass --port to use a different one`)
    }
    throw e
  }
}

export function getBaseUrl (flags: Omit<ServerFlags, 'logs'>, isWebsocket = false): string {
  const { bind: host, port } = flags
  return `${getProtocol(flags, isWebsocket)}://${host}:${port}`
}

function getProtocol (flags: Omit<ServerFlags, 'logs'>, isWebsocket: boolean): string {
  const { 'https-cert': httpsCert, 'https-key': httpsKey } = flags
  if (isWebsocket) {
    return httpsCert && httpsKey ? 'wss' : 'ws'
  } else {
    return httpsCert && httpsKey ? 'https' : 'http'
  }
}
