<img src="logo.png" alt="Zendesk Logo" width="100"/>

# ZCLI

[![npm version](https://badge.fury.io/js/%40zendesk%2Fzcli.svg)](https://www.npmjs.com/package/@zendesk/zcli)
![Test](https://github.com/zendesk/zcli/workflows/Test/badge.svg)

ZCLI is a Zendesk CLI which helps you build and manage your Zendesk apps from the command line. ZCLI is currently available in beta and is built using the [oclif](https://github.com/oclif/oclif) framework.

<img src="demo.gif" alt="Zendesk Logo" />

For more about ZCLI see [the full documentation.](/docs)

# Getting started

This is a [Node.js](https://nodejs.org/en/) module available through the [npm registry.](https://www.npmjs.com/package/@zendesk/zcli)

Before installing, download and install Node.js. Node.js 14.17.3 or higher is required. Installation is done using the npm install command:

```
$ npm install @zendesk/zcli -g
```

## Installation prerequisites for Linux

Currently ZCLI has a dependency on `libsecret` to save authentication information securely in the operating system's keychain.

Depending on your distribution, you will need to run one of the following commands prior to installing ZCLI:
- Debian/Ubuntu: `sudo apt install libsecret-1-dev`
- Red Hat-based: `sudo yum install libsecret-devel`
- Arch Linux: `sudo pacman -S libsecret`

## Note for Windows users running Linux on WSL

ZCLI's credential manager has a dependency on Linux's windowing manager (X11) which will cause some commands to fail to run on WSL, unless you run a setup of WSL with support for X11/GUI apps. These commands include: `zcli login`, `zcli logout` and `zcli profiles`.

Features of ZCLI not dependent on ZCLI's credential manager will work in WSL2 without X11 support.

There are a number of workarounds:

* Manually starting a DBus session and unlocking the Gnome keyring with a password supplied via STDIN
* Using X11 forwarding to be able to enable the Gnome keyring prompt to display

**Windows 11 users**

A better approach might be to await the upcoming support for GUI apps in WSL2 that Microsoft is [working on](https://youtu.be/f8_nvJzuaSU) and that is currently in [Preview](https://docs.microsoft.com/en-us/windows/wsl/tutorials/gui-apps).

# Commands

ZCLI supports numerous commands. Further documentation on available commands can be found [here.](/docs)

- [`$ zcli apps`](/docs/apps.md) - manage zendesk apps workflow.
- [`$ zcli profiles`](/docs/profiles.md) - manage zcli profiles.
- [`$ zcli login`](/docs/login.md) - login to zendesk account.
- [`$ zcli logout`](/docs/logout.md) - logout and remove active profile.
- [`$ zcli autocomplete`](/docs/autocomplete.md) - display autocomplete installation instructions.
- [`$ zcli help`](/docs/help.md) - display help for zcli

# Local development

To run your development copy of ZCLI locally, execute `yarn link:bin`.

Under macOS if you are using a version manager like [`asdf`](https://asdf-vm.com), it can additionally set up the global `/usr/local/bin/zcli`.
Note you need global Node.js and [`ts-node`](https://github.com/TypeStrong/ts-node) for this as well.

```sh
brew install --formula node yarn
yarn global add ts-node
```

Under Windows this can only be used in WSL2 or [Cygwin](https://www.cygwin.com).

# Contributing

---

**Note:** While ZCLI is in beta, we are not routinely reviewing issues and merging community-submitted pull requests. We hope to begin reviewing these again soon, but for the moment we appreciate your patience.

---

Thanks for your interest in ZCLI! Community involvement helps improve the experience for all developers using the Zendesk platform.

Got issues with what you find here? You can [create an issue on Github](https://github.com/zendesk/zcli/issues/new), report the issue in the [Zendesk Developers Slack group](https://docs.google.com/forms/d/e/1FAIpQLScm_rDLWwzWnq6PpYWFOR_PwMaSBcaFft-1pYornQtBGAaiJA/viewform), or for other problems, [contact Zendesk Customer Support](https://support.zendesk.com/hc/en-us/articles/360026614173).

If you'd like to take a crack at making some changes, please refer to [our contributing guide](.github/CONTRIBUTING.md). 

# ZAF App Scaffolding

Some useful app scaffolds for build ZAF apps that incorporate the ZCLI tool are avaliable at [zendesk/app_scaffolds](https://github.com/zendesk/app_scaffolds)

# Releasing

Running the following command will create release tags, generate change logs docs and publish to npm.

[`$ ./scripts/release.sh`](./scripts/release.sh)

# License

Copyright 2022 Zendesk, Inc.

Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
