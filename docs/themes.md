`zcli themes`
===========

zcli themes commands helps with managing Zendesk Help Center theming workflow.

* [`zcli themes:preview [THEMEDIRECTORY]`](#zcli-themespreview-themedirectory)

## Configuration

NOTE: You can set your theme config/settings in `zcli.themes.config.json` at the root of your theme directory ie

```
{
  "subdomain": "mysubdomain",
  "username": "me@email.com",
  "password": "12345678"
}

```

## `zcli themes:preview [THEMEDIRECTORY]`

starts local theme preview. Accepts subdomain, username and password; defaults to `zcli.themes.config.json` or prompts the user when not defined

```
USAGE
  $ zcli themes:preview [THEMEDIRECTORY]

ARGUMENTS
  THEMEDIRECTORY  [default: .] theme path where manifest.json exists

OPTIONS
  --subdomain      Account subdomain or full URL (including protocol)
  --username       Account username (email)
  --password       Account password
  --bind=bind      [default: localhost] Bind theme assets server to a specific host
  --port=port      [default: 4567] Port for the http server to use
  --logs           Tail logs
  --no-livereload  Disable live-reloading the preview when a change is made

EXAMPLES
  $ zcli themes:preview ./copenhagen_theme
  $ zcli themes:preview ./copenhagen_theme --subdomain=mysubdomain --username=me@email.com --password=12345678
  $ zcli themes:preview ./copenhagen_theme --no-livereload
```
