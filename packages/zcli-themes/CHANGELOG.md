# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [1.2.0](https://github.com/zendesk/zcli/compare/v1.1.4...v1.2.0) (2026-08-17)

**Note:** Version bump only for package @zendesk/zcli-themes





## [1.1.4](https://github.com/zendesk/zcli/compare/v1.1.3...v1.1.4) (2026-07-20)

**Note:** Version bump only for package @zendesk/zcli-themes





## [1.1.3](https://github.com/zendesk/zcli/compare/v1.1.2...v1.1.3) (2026-07-20)

**Note:** Version bump only for package @zendesk/zcli-themes





# [1.1.0](https://github.com/zendesk/zcli/compare/v1.0.1...v1.1.0) (2026-06-04)


### Bug Fixes

* create intermediate directories when rewriting nested templates ([806b6f8](https://github.com/zendesk/zcli/commit/806b6f868758b8982757983c7a4dfae6e8452213))
* preserve :line:column suffix when either is 0 in validationErrorsToString ([de10e46](https://github.com/zendesk/zcli/commit/de10e464141159f63830ad373d527e3445d7b191))
* revalidate theme on file add/delete during themes:preview ([7c64a1d](https://github.com/zendesk/zcli/commit/7c64a1d40a20479b5d929ed8d92be0978101c936))
* stop sending local preview URLs in themes:migrate payload ([264ef00](https://github.com/zendesk/zcli/commit/264ef00872959c7a0a68b618e460c9ed6bb63070))
* **themes:** drop extra blank line in types.ts to satisfy eslint ([c029b11](https://github.com/zendesk/zcli/commit/c029b11ffe5b26e1a4a30732f9642bc393d62968))
* throw CLIError on write failures in rewriteAssets and rewriteTemplates ([3ac1b31](https://github.com/zendesk/zcli/commit/3ac1b31c676281f25dbcb51797493bdbc92f1a14))


### Features

* **themes:** send style.css and script.js through themes:migrate ([f1d96f3](https://github.com/zendesk/zcli/commit/f1d96f3e35abd5951419d29be888d91fce221f4c))
* **themes:** wire themes:migrate to the new endpoint contract ([1bbac7b](https://github.com/zendesk/zcli/commit/1bbac7bf0e9d8b98978e31873dba8414bb5ca65d))
* write migrated assets to theme during themes:migrate ([1cc34d5](https://github.com/zendesk/zcli/commit/1cc34d50d3485962356c788593fd7389a0856abf))





# [1.0.0](https://github.com/zendesk/zcli/compare/v1.0.0-beta.57...v1.0.0) (2026-04-23)

**Note:** Version bump only for package @zendesk/zcli-themes





# [1.0.0-beta.55](https://github.com/zendesk/zcli/compare/v1.0.0-beta.54...v1.0.0-beta.55) (2026-02-04)

**Note:** Version bump only for package @zendesk/zcli-themes





# [1.0.0-beta.53](https://github.com/zendesk/zcli/compare/v1.0.0-beta.52...v1.0.0-beta.53) (2025-07-07)

**Note:** Version bump only for package @zendesk/zcli-themes





# [1.0.0-beta.52](https://github.com/zendesk/zcli/compare/v1.0.0-beta.51...v1.0.0-beta.52) (2024-12-18)


### Bug Fixes

* **themes:** increase default retries in jobPollStatus ([b381fe9](https://github.com/zendesk/zcli/commit/b381fe9fb1100e596668232f85408ab426f807a1))





# [1.0.0-beta.51](https://github.com/zendesk/zcli/compare/v1.0.0-beta.50...v1.0.0-beta.51) (2024-09-29)

**Note:** Version bump only for package @zendesk/zcli-themes





# [1.0.0-beta.49](https://github.com/zendesk/zcli/compare/v1.0.0-beta.48...v1.0.0-beta.49) (2024-09-05)

**Note:** Version bump only for package @zendesk/zcli-themes





# [1.0.0-beta.47](https://github.com/zendesk/zcli/compare/v1.0.0-beta.46...v1.0.0-beta.47) (2024-08-05)


### Bug Fixes

* fix unit and functional tests ([e4eb869](https://github.com/zendesk/zcli/commit/e4eb8695e80bba5a397e7d2390accd65d71b9dd4))
* handle compilation errors for lighten and darken functions ([a45f319](https://github.com/zendesk/zcli/commit/a45f31943fdaf1032951111516a78746380fafde))
* replace all instances of lighten and darken functions ([b828b9c](https://github.com/zendesk/zcli/commit/b828b9cc2a28ff8107d6ca84e00dd4ebca85f78c))





# [1.0.0-beta.46](https://github.com/zendesk/zcli/compare/v1.0.0-beta.45...v1.0.0-beta.46) (2024-07-15)

**Note:** Version bump only for package @zendesk/zcli-themes





# [1.0.0-beta.44](https://github.com/zendesk/zcli/compare/v1.0.0-beta.43...v1.0.0-beta.44) (2024-07-15)

**Note:** Version bump only for package @zendesk/zcli-themes





# [1.0.0-beta.43](https://github.com/zendesk/zcli/compare/v1.0.0-beta.42...v1.0.0-beta.43) (2024-07-10)


### Bug Fixes

* use the baseUrl from the request api call ([e7e2552](https://github.com/zendesk/zcli/commit/e7e255282939fe18b087c6a94ae422ff5a6db7b5))





# [1.0.0-beta.40](https://github.com/zendesk/zcli/compare/v1.0.0-beta.39...v1.0.0-beta.40) (2024-01-24)


### Bug Fixes

* bump glob version ([957c5b3](https://github.com/zendesk/zcli/commit/957c5b3c3c78ed26155dd2f6d1162ad817740eda))
* convert Windows paths to POSIX format ([a6f8743](https://github.com/zendesk/zcli/commit/a6f87437036dfcbb1accd30c12eb664d5f7c3db0))
* enforce posix separator in glob result to match split pattern ([9e3f629](https://github.com/zendesk/zcli/commit/9e3f629e5ad9d9d9aab8292f49f4e7b52649e093))





# [1.0.0-beta.39](https://github.com/zendesk/zcli/compare/v1.0.0-beta.38...v1.0.0-beta.39) (2023-10-18)


### Bug Fixes

* improve 'themes' error handling ([73820c1](https://github.com/zendesk/zcli/commit/73820c1a596e0838ac39b0db441e0ab420a81683))


### Features

* **themes:** Added options for starting the preview mode in HTTPS ([fcf7a88](https://github.com/zendesk/zcli/commit/fcf7a8830b2343fe586c7bb3c749fa0ee28acc5b))





# [1.0.0-beta.37](https://github.com/zendesk/zcli/compare/v1.0.0-beta.36...v1.0.0-beta.37) (2023-08-08)


### Features

* added support for logging in to different environments ([c90f0b3](https://github.com/zendesk/zcli/commit/c90f0b3f51be8844bda7b5e6b2644282f80d1654))
* adding a themes delete command ([375011d](https://github.com/zendesk/zcli/commit/375011d6e8e9ee8ab7f61671241039b110fd30f9))
* adding a themes list command ([52d8fd7](https://github.com/zendesk/zcli/commit/52d8fd7f22383e5a5f91e3472191a97d9759c1a7))
* return json in import, update and publish ([cd49d29](https://github.com/zendesk/zcli/commit/cd49d29a47a48379269a17865dee2b78be5f6b69))





# [1.0.0-beta.36](https://github.com/zendesk/zcli/compare/v1.0.0-beta.35...v1.0.0-beta.36) (2023-07-28)


### Bug Fixes

* fixed brand id getter when only one brand is present ([d611dc7](https://github.com/zendesk/zcli/commit/d611dc74f4b4738e86056e983bdc31d3cbfb2ecb))





# [1.0.0-beta.35](https://github.com/zendesk/zcli/compare/v1.0.0-beta.34...v1.0.0-beta.35) (2023-06-28)


### Features

* add a themes:publish command ([5842284](https://github.com/zendesk/zcli/commit/5842284a131e096ae38c9f605b72c68fe3204b62))
* adding support for zcli:themes update ([5b1c4e9](https://github.com/zendesk/zcli/commit/5b1c4e97539e8b97bcb562e85955c0fd35b77b2d))





# [1.0.0-beta.34](https://github.com/zendesk/zcli/compare/v1.0.0-beta.32...v1.0.0-beta.34) (2023-06-21)


### Features

* add a themes:import command ([c9b8fe8](https://github.com/zendesk/zcli/commit/c9b8fe837b54d0ae754393fe477d5358cf574e6d))





# [1.0.0-beta.33](https://github.com/zendesk/zcli/compare/v1.0.0-beta.32...v1.0.0-beta.33) (2023-05-26)

**Note:** Version bump only for package @zendesk/zcli-themes
