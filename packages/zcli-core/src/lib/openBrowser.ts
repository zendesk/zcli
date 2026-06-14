import { spawn } from 'child_process'

export const _pickCommand = (platform: string): { cmd: string; args: string[] } => {
  if (platform === 'darwin') return { cmd: 'open', args: [] }
  if (platform === 'win32') return { cmd: 'cmd', args: ['/c', 'start', '""'] }
  return { cmd: 'xdg-open', args: [] }
}

export const openBrowser = (url: string, platform: string = process.platform): void => {
  const { cmd, args } = _pickCommand(platform)
  try {
    const child = spawn(cmd, [...args, url], { detached: true, stdio: 'ignore' })
    child.on('error', () => undefined)
    child.unref()
  } catch {
    // best-effort; caller still prints the URL
  }
}
