import { Profile } from '../types'

/**
 * Parse a subdomain.
 *
 * If someone mistakenly provides full hostname or Url instead of a subdomain
 * then strip out domain name from it.
 *
 * @param {string} subdomain - The subdomain.
 * @return {string} The parsed subdomain.
 */
export const parseSubdomain = (subdomain: string) => {
  subdomain = subdomain.trim().toLowerCase()
  const regex = /(?:http[s]*:\/\/)*(.*?)\.zendesk.com[/]?$/i
  const result = regex.exec(subdomain)
  return result !== null ? result[1] : subdomain
}

export const getAccount = (subdomain: string, domain?: string): string => {
  return domain ? `${subdomain}.${domain}` : subdomain
}

export const getProfileFromAccount = (account: string): Profile => {
  const firstDotIndex = account.indexOf('.')
  if (firstDotIndex === -1) {
    return { subdomain: account }
  }
  return { subdomain: account.substring(0, firstDotIndex), domain: account.substring(firstDotIndex + 1) }
}
