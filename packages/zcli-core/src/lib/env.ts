export const EnvVars = {
  SUBDOMAIN: 'ZENDESK_SUBDOMAIN',
  EMAIL: 'ZENDESK_EMAIL',
  PASSWORD: 'ZENDESK_PASSWORD',
  API_TOKEN: 'ZENDESK_API_TOKEN',
  OAUTH_TOKEN: 'ZENDESK_OAUTH_TOKEN'
}

export const varExists = (...args: any[]) => !args.filter(envVar => !process.env[envVar]).length
