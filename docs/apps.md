`zcli apps`
===========

zcli apps commands helps with managing Zendesk apps workflow.

NOTE: You can set your apps config/settings in `zcli.apps.config.json` at the root of your app directory ie

```
{
  "plan": "silver",
  "app_id": 123,
  "installation_id": 12434234,
  "parameters": {
    "someToken": "fksjdhfb231435",
    "someSecret": 123
  }
}

```

See [these mock apps](https://github.com/zendesk/zcli/tree/master/packages/zcli-apps/tests/functional/mocks) for more references of `zcli.apps.config.json`.

* [`zcli apps:bump [APPPATH]`](#zcli-appsbump-apppath)
* [`zcli apps:clean [APPPATH]`](#zcli-appsclean-apppath)
* [`zcli apps:create APPDIRECTORIES`](#zcli-appscreate-appdirectories)
* [`zcli apps:new`](#zcli-appsnew)
* [`zcli apps:package APPDIRECTORY`](#zcli-appspackage-appdirectory)
* [`zcli apps:server APPDIRECTORIES`](#zcli-appsserver-appdirectories)
* [`zcli apps:update APPDIRECTORIES`](#zcli-appsupdate-appdirectories)
* [`zcli apps:validate APPDIRECTORY`](#zcli-appsvalidate-appdirectory)

## `zcli apps:bump [APPPATH]`

bumps the version of your app in the manifest file. Accepts major, minor and patch; defaults to patch.

```
USAGE
  $ zcli apps:bump [APPPATH]

OPTIONS
  -M, --major  Increments the major version by 1
  -m, --minor  Increments the minor version by 1
  -p, --patch  Increments the patch version by 1

EXAMPLES
  $ zcli apps:bump ./repl-app2
  $ zcli apps:bump -M ./repl-app2
  $ zcli apps:bump -m ./repl-app2
  $ zcli apps:bump -p ./repl-app2
```

## `zcli apps:clean [APPPATH]`

purges any app artifacts which have been generated locally

```
USAGE
  $ zcli apps:clean [APPPATH]

EXAMPLE
  $ zcli apps:clean ./app
```

## `zcli apps:create APPDIRECTORIES`

creates apps in your desired target account

```
USAGE
  $ zcli apps:create APPDIRECTORIES

EXAMPLES
  $ zcli apps:create ./app
  $ zcli apps:create ./app1 ./app2
```

## `zcli apps:new`

generates a bare bones app locally for development

```
USAGE
  $ zcli apps:new

OPTIONS
  --appName=appName          Name of the app
  --authorEmail=authorEmail  Email of app author
  --authorName=authorName    Name of app author
  --path=path                Path of your new app
  --scaffold=scaffold        [default: basic] Choose from open-source Zendesk app scaffold structures

EXAMPLES
  $ zcli apps:new
  $ zcli apps:new --scaffold=basic
  $ zcli apps:new --scaffold=react
```

## `zcli apps:package APPDIRECTORY`

validates and packages your app

```
USAGE
  $ zcli apps:package APPDIRECTORY

ARGUMENTS
  APPDIRECTORY  [default: .] app path where manifest.json exists

EXAMPLES
  $ zcli apps:package .
  $ zcli apps:package ./app1
```

## `zcli apps:server APPDIRECTORIES`

serves apps in development mode

```
USAGE
  $ zcli apps:server APPDIRECTORIES

OPTIONS
  -h, --help       show CLI help
  --bind=bind      [default: localhost] Bind apps server to a specific host
  --logs           Tail logs
  --port=port      [default: 4567] Port for the http server to use

EXAMPLES
  $ zcli apps:server ./repl-app2
  $ zcli apps:server ./repl-app2 ./knowledge-capture-app
```

After server is running, add `?zcli_apps=true` to the end of your Zendesk URL to load from the locally served apps. `?zat=true` will *not* work with ZCLI.  

## `zcli apps:update APPDIRECTORIES`

updates an existing private app in the Zendesk products specified in the apps manifest file.

```
USAGE
  $ zcli apps:update APPDIRECTORIES
```

## `zcli apps:validate APPDIRECTORY`

validates your app

```
USAGE
  $ zcli apps:validate APPDIRECTORY

ARGUMENTS
  APPDIRECTORY  [default: .] app path where manifest.json exists

EXAMPLES
  $ zcli apps:validate .
  $ zcli apps:validate ./app1
```
