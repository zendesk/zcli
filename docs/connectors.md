`zcli connectors`
=================

The `zcli connectors` commands help manage Zendesk connector workflows. **[Early Access - Limited Availability]**

**Note:** Connector development tools are in early access and currently available only to approved developers. If you're interested in connector development, please visit the [waitlist](https://docs.google.com/forms/d/e/1FAIpQLScHEjw23pT4DPQ3t-hxCVAEw-TWtXVpEroVfMGrxlcmaeHfxg/viewform?usp=header).

* [`zcli connectors:bump [PATH]`](#zcli-connectorsbump-path)
* [`zcli connectors:bundle [PATH]`](#zcli-connectorsbundle-path)
* [`zcli connectors:create CONNECTOR`](#zcli-connectorscreate-connector)
* [`zcli connectors:delete [CONNECTOR]`](#zcli-connectorsdelete-connector)
* [`zcli connectors:encryption-key`](#zcli-connectorsencryption-key)
* [`zcli connectors:encrypt-secret`](#zcli-connectorsencrypt-secret)
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

## `zcli connectors:delete [CONNECTOR]`

delete a private connector from your account

```
USAGE
  $ zcli connectors:delete [CONNECTOR]

ARGUMENTS
  CONNECTOR  name of the connector to delete

OPTIONS
  -h, --help     show CLI help
  -v, --verbose  verbose output
  -f, --force    skip confirmation prompt

EXAMPLES
  $ zcli connectors:delete my-connector
  $ zcli connectors:delete
  $ zcli connectors:delete my-connector --force
```

## `zcli connectors:encryption-key`

Download the active public connector encryption key from Zendesk.

The downloaded RSA public key is used to encrypt publisher-owned connector secrets, such as an OAuth client secret, before they are added to the connector's root `settings.json` file.

The key is public material. ZCLI downloads it fresh from Zendesk every time the command runs and writes it atomically, so a failed download or invalid response does not replace a previously downloaded key.

> **Early Access:** Public connector development is currently available only to approved developers.

```text
USAGE
  $ zcli connectors:encryption-key -o <path>

OPTIONS
  -o, --output=<path>  (required) destination file for the downloaded PEM public key
  -h, --help           show CLI help
  -v, --verbose        verbose output

EXAMPLES
  $ zcli connectors:encryption-key --output public-key.pem
  $ zcli connectors:encryption-key -o ./keys/public-key.pem
```

**Note:** The parent directory of the output path must already exist.

The command uses the currently selected Zendesk environment and requires authenticated account-administrator credentials. It returns an actionable error when:

- authentication is missing or expired (`401`);
- the authenticated user lacks permission (`403`);
- the encryption key is temporarily unavailable (`503`);
- the response does not contain a valid RSA public key;
- the destination cannot be written.

The downloaded public key is not secret and can be stored with the connector's local development tooling. Do not add plaintext connector secrets to source control, shell arguments, or logs.

## `zcli connectors:encrypt-secret`

Encrypt a publisher-owned connector secret, such as an OAuth client secret, for the connector's root `settings.json` file.

The secret is read from standard input — never pass it as a command argument, where it would be exposed in shell history and process listings. The command prints a single `enc:v1:` encrypted value to standard output, ready to paste into `settings.json` as the `encrypted_value` of `authentication.client_secret`. The Early Access banner and verbose details are written to standard error, so standard output can be piped directly into a file or clipboard.

The output is a compact JWE (RSA-OAEP-256 key encryption, A256GCM content encryption) whose protected `kid` header is the base64url SHA-256 fingerprint of the public key, matching the format the public connector provisioning pipeline expects.

> **Early Access:** Public connector development is currently available only to approved developers.

```text
USAGE
  $ zcli connectors:encrypt-secret

OPTIONS
  -k, --key=<path>  path to a PEM public key downloaded with connectors:encryption-key
                    (default: fetch the active key from Zendesk)
  -h, --help        show CLI help
  -v, --verbose     verbose output

EXAMPLES
  $ my-secret-manager-command | zcli connectors:encrypt-secret
  $ my-secret-manager-command | zcli connectors:encrypt-secret --key public-key.pem
```

By default the command fetches the active public key from Zendesk before encrypting, so the value always matches the key Zendesk currently expects. Use `--key` to encrypt against a previously downloaded key file instead.

The command uses the currently selected Zendesk environment and requires authenticated account-administrator credentials when fetching the key. It returns an actionable error when:

- authentication is missing or expired (`401`);
- the authenticated user lacks permission (`403`);
- the encryption key is temporarily unavailable (`503`);
- the key is not a valid RSA public key PEM (private keys are rejected);
- the secret is empty or exceeds the maximum supported size.

Although the output is encrypted, treat it as sensitive provisioning material: do not publish it in logs, tickets, or source control.

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
