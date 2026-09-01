`zcli login`
============

Log in to your Zendesk account using browser-based OAuth authentication.

* [`zcli login`](#zcli-login)

## `zcli login`

Log in to your Zendesk account and save authentication credentials for the specified subdomain

```
USAGE
  $ zcli login

OPTIONS
  -h, --help                 show CLI help
  -s, --subdomain=subdomain  Zendesk Subdomain
  -d, --domain=domain        Zendesk Domain (optional)

EXAMPLES
  $ zcli login
  $ zcli login -s zendesk-subdomain
  $ zcli login -s zendesk-subdomain -d example.com
  $ zcli login -s zendesk-subdomain -d zendesk-staging.com
```

## Custom Domains

For development purposes, you can specify a domain different from `zendesk.com` for logging in to a different environment:

```bash
# Login to zendesk-subdomain.example.com
$ zcli login -s zendesk-subdomain -d example.com
```

If the `-d` option is not specified, the default `zendesk.com` domain will be used.

## CI/CD and Unattended Environments

For CI/CD pipelines or environments without browser access, you can configure the environment variables required for the client-credentials OAuth flow instead of running the login command:

- `ZENDESK_OAUTH_CLIENT_ID` - Your OAuth client ID
- `ZENDESK_OAUTH_CLIENT_SECRET` - Your OAuth client secret
- `ZENDESK_APP_ID` - Your Zendesk app ID
- `ZENDESK_SUBDOMAIN` - Your Zendesk subdomain
- `ZENDESK_DOMAIN` - (Optional) Custom domain if not using zendesk.com

When these variables are set, you don't need to run the login command.
