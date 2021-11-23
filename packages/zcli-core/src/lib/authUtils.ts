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
