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

EXAMPLES
  $ zcli login -i
  $ zcli login -s zendesk-subdomain -i
```


NOTE: For CI/CD or unattended login you can set `ZENDESK_SUBDOMAIN`, `ZENDESK_EMAIL` and `ZENDESK_API_TOKEN` environment variables. You don't need to run login command if you have set these environment variables.
