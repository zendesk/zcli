`zcli themes`
===========

zcli themes commands helps with managing Zendesk Help Center theming workflow.

* [`zcli themes:preview [THEMEDIRECTORY]`](#zcli-themespreview-themedirectory)

## Configuration

NOTE: preview requires login so make sure to first run `zcli login -i`

## `zcli themes:preview [THEMEDIRECTORY]`

starts local theme preview

```
USAGE
  $ zcli themes:preview [THEMEDIRECTORY]

ARGUMENTS
  THEMEDIRECTORY  [default: .] theme path where manifest.json exists

OPTIONS
  --bind=bind      [default: localhost] Bind theme assets server to a specific host
  --port=port      [default: 4567] Port for the http server to use
  --logs           Tail logs
  --no-livereload  Disable live-reloading the preview when a change is made

EXAMPLES
  $ zcli themes:preview ./copenhagen_theme
  $ zcli themes:preview ./copenhagen_theme --port=9999
  $ zcli themes:preview ./copenhagen_theme --no-livereload
```
