import { Flags } from '../types'

export function getLocalServerBaseUrl (flags: Flags, isWebsocket = false): string {
  const { bind: host, port } = flags
  return `${getProtocol(flags, isWebsocket)}://${host}:${port}`
}

function getProtocol (flags: Flags, isWebsocket: boolean): string {
  const { 'https-cert': httpsCert, 'https-key': httpsKey } = flags
  if (isWebsocket) {
    return httpsCert && httpsKey ? 'wss' : 'ws'
  } else {
    return httpsCert && httpsKey ? 'https' : 'http'
  }
}
