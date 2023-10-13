import Auth from './auth'

export const getSubdomain = async (auth: Auth): Promise<string> => {
  return (await auth.getLoggedInProfile())?.subdomain
}

export const getDomain = async (auth: Auth): Promise<string | undefined> => {
  return (await auth.getLoggedInProfile())?.domain
}

export const getBaseUrl = (subdomain: string, domain?: string): string => {
  return `https://${subdomain}.${domain || 'zendesk.com'}`
}

export const isAbsoluteUrl = (url: string) => {
  return url.indexOf('http://') === 0 || url.indexOf('https://') === 0
}
