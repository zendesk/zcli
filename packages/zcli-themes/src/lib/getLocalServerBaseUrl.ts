import { Flags } from '../types'

export function getLocalServerBaseUrl (flags: Flags, isWebsocket = false): string {
  const { bind: host, port } = flags
  return `${getProtocol(flags, isWebsocket)}://${host}:${port}`
}

function getProtocol (flags: Flags, isWebsocket: boolean): string {
  const { 'ssl-cert': sslCert, 'ssl-key': sslKey } = flags
  if (isWebsocket) {
    return sslCert && sslKey ? 'wss' : 'ws'
  } else {
    return sslCert && sslKey ? 'https' : 'http'
  }
}
