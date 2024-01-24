`zcli themes`
===========

zcli themes commands helps with managing Zendesk Help Center theming workflow.

* [`zcli themes:preview [THEMEDIRECTORY]`](#zcli-themespreview-themedirectory)
* [`zcli themes:import [THEMEDIRECTORY]`](#zcli-themesimport-themedirectory)
* [`zcli themes:update [THEMEDIRECTORY]`](#zcli-themesupdate-themedirectory)
* [`zcli themes:publish`](#zcli-themespublish)
* [`zcli themes:delete`](#zcli-themesdelete)
* [`zcli themes:list`](#zcli-themeslist)

## Configuration

NOTE: theme commands require login so make sure to first run `zcli login -i`

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
  --https-cert     Certificate used to start the server in HTTPS mode
  --https-key      Key used to start the server in HTTPS mode

EXAMPLES
  $ zcli themes:preview ./copenhagen_theme
  $ zcli themes:preview ./copenhagen_theme --port=9999
  $ zcli themes:preview ./copenhagen_theme --no-livereload
  $ zcli themes:preview ./copenhagen_theme --https-cert localhost.crt --https-key localhost.key
```

### HTTPS
When using the preview mode, you open your instance on `https://[subdomain].zendesk.com`, and all the theme assets are served from a local web server that runs by default on `http://localhost:4567`. An HTTPS page that includes content fetched using HTTP is called a mixed content page.

Some browsers (like Safari) [don't allow mixed content for localhost](https://developer.mozilla.org/en-US/docs/Web/Security/Mixed_content#loading_locally_delivered_mixed-resources). This means that when using the preview mode with the default settings, the connection to the local server is blocked by the browser. To avoid this issue you need to have an SSL certificate and an SSL Key for the local server and pass them to ZCLI using the `--https-cert` and `--https-key` options.

One option is to use https://github.com/Upinel/localhost.direct, which provides a wildcard certificate for `*.localhost.direct`, and a DNS record that redirects `*.localhost.direct` to `localhost`. You just need to download the certificates and start the preview mode binding to a `localhost.direct` subdomain and passing the certificate files:

```
zcli themes:preview --bind themes.localhost.direct --https-cert ~/localhost.direct.crt --https-key ~/localhost.direct.key
```

Another option is to [create a self-signed certificate for localhost](https://letsencrypt.org/docs/certificates-for-localhost/#making-and-trusting-your-own-certificates). In this case, you need to create the certificate, trust it in the Mac OS System Keychain, and pass the required options to `zcli`:

```
zcli themes:preview --https-cert ~/localhost.crt --https-key ~/localhost.key
```

## `zcli themes:import [THEMEDIRECTORY]`

imports a theme in your desired target account and brand

```
USAGE
  $ zcli themes:import [THEMEDIRECTORY]

ARGUMENTS
  THEMEDIRECTORY  [default: .] theme path where manifest.json exists

OPTIONS
  --brandId       The id of the brand where the theme should be imported to
  --json          Return JSON output (useful in CI)

EXAMPLES
  $ zcli themes:import ./copenhagen_theme
  $ zcli themes:import ./copenhagen_theme --brandId=123456
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
  --json                  Return JSON output (useful in CI)

EXAMPLES
  $ zcli themes:update ./copenhagen_theme --themeId=123456789100
  $ zcli themes:update ./copenhagen_theme --themeId=123456789100 --replaceSettings
```

## `zcli themes:publish`

publishes a theme

```
USAGE
  $ zcli themes:publish

OPTIONS
  --themeId       The id of the theme to publish
  --json          Return JSON output (useful in CI)

EXAMPLES
  $ zcli themes:publish --themeId=123456789100
```

## `zcli themes:delete`

deletes a theme

```
USAGE
  $ zcli themes:delete

OPTIONS
  --themeId       The id of the theme to delete
  --json          Return JSON output (useful in CI)

EXAMPLES
  $ zcli themes:delete --themeId=123456789100
```

## `zcli themes:list`

lists all themes in your desired target account and brand

```
USAGE
  $ zcli themes:list

OPTIONS
  --brandId       The id of the brand containing the themes
  --json          Return JSON output (useful in CI)

EXAMPLES
  $ zcli themes:import ./copenhagen_theme
  $ zcli themes:import ./copenhagen_theme --brandId=123456
  $ zcli themes:import ./copenhagen_theme --brandId=123456 --json
```
