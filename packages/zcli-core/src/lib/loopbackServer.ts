import * as http from 'http'

export type LoopbackParams = {
  port: number;
  path: string;
  expectedState: string;
  timeoutMs?: number;
}

const SUCCESS_HTML = `<!doctype html>
<html><head><meta charset="utf-8"><title>ZCLI login</title></head>
<body style="font-family:system-ui;text-align:center;padding-top:5em;">
<h1>You're logged in.</h1>
<p>You can close this tab and return to your terminal.</p>
</body></html>`

const ERROR_HTML = (msg: string) => `<!doctype html>
<html><head><meta charset="utf-8"><title>ZCLI login error</title></head>
<body style="font-family:system-ui;text-align:center;padding-top:5em;">
<h1>Login failed.</h1>
<p>${msg}</p>
</body></html>`

export const awaitLoopbackCode = (opts: LoopbackParams): Promise<string> => {
  const timeoutMs = opts.timeoutMs ?? 120_000

  return new Promise<string>((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url ?? '/', `http://localhost:${opts.port}`)
      if (url.pathname !== opts.path) {
        res.statusCode = 404
        res.end('Not Found')
        return
      }

      const error = url.searchParams.get('error')
      const code = url.searchParams.get('code')
      const state = url.searchParams.get('state')

      const finish = (status: number, body: string, after: () => void) => {
        res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8' })
        res.end(body, () => {
          cleanup()
          after()
        })
      }

      if (error) {
        finish(400, ERROR_HTML(`OAuth error: ${error}`), () => reject(new Error(`OAuth callback returned error: ${error}`)))
        return
      }
      if (!code || !state) {
        finish(400, ERROR_HTML('Missing code or state.'), () => reject(new Error('OAuth callback missing code or state')))
        return
      }
      if (state !== opts.expectedState) {
        finish(400, ERROR_HTML('State mismatch.'), () => reject(new Error('OAuth callback state did not match expected state')))
        return
      }
      finish(200, SUCCESS_HTML, () => resolve(code))
    })

    let timer: ReturnType<typeof setTimeout> | undefined
    const cleanup = () => {
      if (timer) clearTimeout(timer)
      server.close()
    }

    server.once('error', (err: Error & { code?: string }) => {
      cleanup()
      if (err.code === 'EADDRINUSE') {
        reject(new Error(`Port ${opts.port} is already in use`))
      } else {
        reject(err)
      }
    })

    server.listen(opts.port, '127.0.0.1', () => {
      timer = setTimeout(() => {
        cleanup()
        reject(new Error('OAuth login timed out waiting for browser callback'))
      }, timeoutMs)
    })
  })
}
