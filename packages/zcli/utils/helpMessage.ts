export const HELP_ENV_VARS = `
You can use credentials stored in environment variables:

# OPTION 1 (recommended)
ZENDESK_SUBDOMAIN = your account subdomain
ZENDESK_EMAIL = your account email
ZENDESK_API_TOKEN = your account api token see https://{subdomain}.zendesk.com/agent/admin/api/settings

# OPTION 2
ZENDESK_SUBDOMAIN = your account subdomain
ZENDESK_EMAIL = your account email
ZENDESK_PASSWORD = your account password

Once these environment variables are set, zcli profile is not required for authentication and will be ignored.
`
