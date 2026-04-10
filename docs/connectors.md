`zcli connectors`
=================

The `zcli connectors` commands help manage Zendesk connector workflows.

* [`zcli connectors:bump [PATH]`](#zcli-connectorsbump-path)
* [`zcli connectors:bundle [PATH]`](#zcli-connectorsbundle-path)
* [`zcli connectors:create CONNECTOR`](#zcli-connectorscreate-connector)
* [`zcli connectors:list`](#zcli-connectorslist)
* [`zcli connectors:publish [PATH]`](#zcli-connectorspublish-path)
* [`zcli connectors:publish-status [PATH]`](#zcli-connectorspublish-status-path)

## `zcli connectors:bump [PATH]`

bumps the version of your connector

```
USAGE
  $ zcli connectors:bump [PATH]

OPTIONS
  -M, --major  increments the major version by 1
  -m, --minor  increments the minor version by 1
  -p, --patch  increments the patch version by 1
  -h, --help   show CLI help

EXAMPLES
  $ zcli connectors:bump
  $ zcli connectors:bump ./my-connector
  $ zcli connectors:bump -M ./my-connector
  $ zcli connectors:bump -m ./my-connector
  $ zcli connectors:bump -p ./my-connector
```

## `zcli connectors:bundle [PATH]`

bundles your connector for distribution

```
USAGE
  $ zcli connectors:bundle [PATH]

OPTIONS
  -h, --help     show CLI help
  -v, --verbose  verbose output
  -w, --watch    watch for file changes and automatically rebundle the connector

EXAMPLES
  $ zcli connectors:bundle
  $ zcli connectors:bundle ./example-connector
  $ zcli connectors:bundle --watch
  $ zcli connectors:bundle ./example-connector --watch
```

## `zcli connectors:create CONNECTOR`

scaffolds a new connector project

```
USAGE
  $ zcli connectors:create CONNECTOR

OPTIONS
  -h, --help  show CLI help

ARGUMENTS
  CONNECTOR  name of the connector

EXAMPLE
  $ zcli connectors:create connector-name
```

## `zcli connectors:list`

list private connectors for the current account

```
USAGE
  $ zcli connectors:list

OPTIONS
  -h, --help     show CLI help
  -v, --verbose  verbose output
  --json         output in JSON format

EXAMPLES
  $ zcli connectors:list
  $ zcli connectors:list --json
```

## `zcli connectors:publish [PATH]`

publish a connector to the current account

```
USAGE
  $ zcli connectors:publish [PATH]

ARGUMENTS
  PATH  path to connector directory

OPTIONS
  -h, --help            show CLI help
  -v, --verbose         verbose output
  --validationOnly      validate the connector without publishing

EXAMPLES
  $ zcli connectors:publish ./example-connector
  $ zcli connectors:publish ./example-connector --validationOnly
```

## `zcli connectors:publish-status [PATH]`

check the provisioning status of a connector

```
USAGE
  $ zcli connectors:publish-status [PATH]

ARGUMENTS
  PATH  path to connector directory

OPTIONS
  -h, --help  show CLI help

EXAMPLES
  $ zcli connectors:publish-status
  $ zcli connectors:publish-status ./my-connector
```
