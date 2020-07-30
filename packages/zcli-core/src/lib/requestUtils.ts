import Auth from './auth'

export const getSubdomain = async (auth: Auth): Promise<string> => {
  return (await auth.getLoggedInProfile())?.subdomain
}
