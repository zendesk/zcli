export const EnvVars = {
  SUBDOMAIN: 'ZENDESK_SUBDOMAIN',
  DOMAIN: 'ZENDESK_DOMAIN',
  EMAIL: 'ZENDESK_EMAIL',
  PASSWORD: 'ZENDESK_PASSWORD',
  API_TOKEN: 'ZENDESK_API_TOKEN',
  OAUTH_TOKEN: 'ZENDESK_OAUTH_TOKEN',
  APP_ID: 'ZENDESK_APP_ID',
}

export const varExists = (...args: any[]) => !args.filter(envVar => !process.env[envVar]).length
