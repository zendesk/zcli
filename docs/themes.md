`zcli themes`
===========

zcli themes commands helps with managing Zendesk Help Center theming workflow.

* [`zcli themes:preview [THEMEDIRECTORY]`](#zcli-themespreview-themedirectory)
* [`zcli themes:import [THEMEDIRECTORY]`](#zcli-themesimport-themedirectory)
* [`zcli themes:update [THEMEDIRECTORY]`](#zcli-themesupdate-themedirectory)

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

* [`zcli themes:import [THEMEDIRECTORY]`](#zcli-themesimport-themedirectory)

## Configuration

NOTE: import requires login so make sure to first run `zcli login -i`

## `zcli themes:import [THEMEDIRECTORY]`

imports a theme in your desired target account and brand

```
USAGE
  $ zcli themes:import [THEMEDIRECTORY]

ARGUMENTS
  THEMEDIRECTORY  [default: .] theme path where manifest.json exists

OPTIONS
  --brandId       The id of the brand where the theme should be imported to

EXAMPLES
  $ zcli themes:import ./copenhagen_theme
  $ zcli themes:import ./copenhagen_theme --brandId=123456789100
```

## `zcli themes:update [THEMEDIRECTORY]`

updates a theme

```
USAGE
  $ zcli themes:update [THEMEDIRECTORY]

ARGUMENTS
  THEMEDIRECTORY  [default: .] theme path where manifest.json exists

OPTIONS
  --themeId               The id of the theme to update
  --replaceSettings       [default: false] Whether or not to replace the current theme settings

EXAMPLES
  $ zcli themes:update ./copenhagen_theme --themeId=123456789100
  $ zcli themes:update ./copenhagen_theme --themeId=123456789100 --replaceSettings
```
