export const HELP_ENV_VARS = `
You can use credentials stored in environment variables.

API token (recommended for headless / CI):
  ZENDESK_SUBDOMAIN = your account subdomain
  ZENDESK_EMAIL     = your account email
  ZENDESK_API_TOKEN = your account api token (https://{subdomain}.zendesk.com/agent/admin/api/settings)

Or, an OAuth bearer token:
  ZENDESK_SUBDOMAIN    = your account subdomain
  ZENDESK_OAUTH_TOKEN  = a Zendesk OAuth access token

Once these environment variables are set, the active zcli profile is ignored for authentication.
`
