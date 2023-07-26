`zcli login`
============

creates and/or saves an authentication token for the specified subdomain

* [`zcli login`](#zcli-login)

## `zcli login`

creates and/or saves an authentication token for the specified subdomain

```
USAGE
  $ zcli login

OPTIONS
  -h, --help                 show CLI help
  -i, --interactive          Use Terminal based login
  -s, --subdomain=subdomain  Zendesk Subdomain
  -d, --domain=domain        Zendesk Domain (optional)

EXAMPLES
  $ zcli login -i
  $ zcli login -s zendesk-subdomain -i
  $ zcli login -s zendesk-subdomain -d example.com -i
  $ zcli login -s zendesk-subdomain -d dev.example.com -i
  $ zcli login -d example.com -i
```

NOTE: For development purposes, you can specify a domain different from `zendesk.com` for logging in to a different environment. For example, if the environment is hosted on `example.com`, you can run 
`zcli login -s zendesk-subdomain -d example.com -i` and you will be logged in to `zendesk-subdomain.example.com`. If the option is not specified, the default `zendesk.com` domain will be used.

NOTE: For CI/CD or unattended login you can set `ZENDESK_SUBDOMAIN`, `ZENDESK_EMAIL` and `ZENDESK_API_TOKEN` environment variables. You don't need to run login command if you have set these environment variables.
You can also set the `ZENDESK_DOMAIN` environment variable for different environments.
