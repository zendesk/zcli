`zcli theme`
===========

zcli theme commands helps with managing Zendesk Help Center theming workflow.

* [`zcli theme:preview [THEMEPATH]`](#zcli-themepreview-themepath)

## Configuration

NOTE: You can set your theme config/settings in `zcli.theme.config.json` at the root of your theme directory ie

```
{
  "subdomain": "mysubdomain",
  "username": "me@email.com",
  "password": "12345678"
}

```

## `zcli theme:preview [THEMEPATH]`

starts local theme preview. Accepts subdomain, username and password; defaults to `zcli.theme.config.json` or prompts the user when not defined

```
USAGE
  $ zcli theme:preview [THEMEPATH]

OPTIONS
  --subdomain  Account subdomain or full URL (including protocol)
  --username  Account username (email)
  --password  Account password

EXAMPLES
  $ zcli theme:preview ./copenhagen_theme
  $ zcli theme:preview ./copenhagen_theme --subdomain=mysubdomain --username=me@email.com --password=12345678
```
