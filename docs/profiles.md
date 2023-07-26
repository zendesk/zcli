`zcli profiles`
===============

manage cli user profiles

* [`zcli profiles:list`](#zcli-profileslist)
* [`zcli profiles:remove ACCOUNT`](#zcli-profilesremove-account)
* [`zcli profiles:use ACCOUNT`](#zcli-profilesuse-account)

Note: `ACCOUNT` means `subdomain` if you logged in using only the subdomain or `subdomain.domain` if you logged in to an environment hosted on a different domain

## `zcli profiles:list`

lists all the profiles

```
USAGE
  $ zcli profiles:list

EXAMPLE
  $ zcli profiles:list
```

## `zcli profiles:remove ACCOUNT`

removes a profile

```
USAGE
  $ zcli profiles:remove ACCOUNT

EXAMPLE
  $ zcli profiles:remove zendesk-subdomain
  $ zcli profiles:remove zendesk-subdomain.example.com
```

## `zcli profiles:use ACCOUNT`

switches to a profile

```
USAGE
  $ zcli profiles:use ACCOUNT

EXAMPLE
  $ zcli profiles:use zendesk-subdomain
  $ zcli profiles:use zendesk-subdomain.example.com
```
