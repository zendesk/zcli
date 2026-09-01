export const HELP_KEYTAR_REQUIRED = `
zcli profiles require keytar for credential storage. Install keytar to continue.
`

export const HELP_ENV_VARS = `
For CI/CD or other unattended environments, authenticate without \`zcli login\` by setting:

ZENDESK_SUBDOMAIN = your account subdomain
ZENDESK_OAUTH_CLIENT_ID = your OAuth client ID
ZENDESK_OAUTH_CLIENT_SECRET = your OAuth client secret
ZENDESK_DOMAIN = optional custom domain
ZENDESK_OAUTH_TOKEN = OAuth access token
ZENDESK_EMAIL = your account email
ZENDESK_API_TOKEN = your account API token

Then run the required zcli command. These variables are used instead of a saved zcli profile.
`
