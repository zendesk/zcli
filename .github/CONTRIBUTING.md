# Contributing to ZCLI

Keen to contribute to ZCLI? We're stoked to have you join us. You may
find that opening an
[issue](https://github.com/zendesk/zcli/issues) is the
best way to get a conversation started. When you're ready to submit a
pull request, follow the [steps](#pull-request-workflow) below. We
follow a [code of conduct](CODE_OF_CONDUCT.md) as our guide for
community behavior.

This is a multi-package repo which uses [Lerna](https://lernajs.io/) to
manage shared and cross-package dependencies. The basic repo layout
includes:

- `├── package.json` – the top-level "project" package that contains
  the dependencies and scripts needed to manage the multi-package repo.
  _This package will never be published to the npm registry._
- `└─── packages/` – the folder that contains individual packages which are published to the npm registry.<br>
  &nbsp;&nbsp;&nbsp;&nbsp;`├── zcli/` – contains the main package and is published as `@zendesk/zcli`<br>
  &nbsp;&nbsp;&nbsp;&nbsp;`├── zcli-apps/` - contains apps related commands as a npm plugin<br>
  &nbsp;&nbsp;&nbsp;&nbsp;`├── zcli-themes/` - contains themes related commands as a npm plugin<br>

## Versioning Workflow

ZCLI follows [semantic versioning](https://semver.org/). We release
patch versions for bugfixes, minor versions for new features, and major
versions for any breaking changes.

The [pull request workflow](#pull-request-workflow) along with the [PR
template](PULL_REQUEST_TEMPLATE.md) will help us determine how to
version your contributions.

All changes are recorded in applicable package CHANGELOG files after
your PR is merged.

## Development Workflow

Before you start, be sure [yarn](https://yarnpkg.com/en/) is installed
on your system. After you clone this repo, run `yarn` to install
dependencies needed for development. After installation, the following
commands are available:

- `yarn dev` to run zcli
- `yarn lint` to lint your typescript code using standardjs eslint config
- `yarn test` to run test in all the packages

Running `yarn dev` or `./packages/zcli/bin/run` will run the cli locally. Alternatively, you can also symlink your local CLI as a global `zcli` binary by running `yarn run link:bin`.

## Pull Request Workflow

1. Fork the repo and create a branch. Format your branch name as
   `username/verb-noun`.
1. If you haven't yet, get comfortable with the [development
   environment](#development-workflow).
1. Regularly `git commit` locally and `git push` to the remote branch.
   Use whatever casual commit messaging you find suitable. We'll help
   you apply an appropriate squashed [conventional
   commit](https://conventionalcommits.org/) message when it's time to
   merge to master.
1. If your changes result in a major modification, be sure all
   documentation is up-to-date.
1. When your branch is ready, open a new pull request via GitHub.
   The repo [PR template](PULL_REQUEST_TEMPLATE.md) will guide you
   toward describing your contribution in a format that is ultimately
   suitable for a structured conventional commit (used to automatically
   advance published package versions).
1. Every PR must pass CI checks and receive at least two :+1: to be
   considered for a merge.

## License
By contributing to ZCLI, you agree that your contributions will be
licensed under the [Apache License, Version 2.0](LICENSE.md).
