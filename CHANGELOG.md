# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [1.0.0-beta.52](https://github.com/zendesk/zcli/compare/v1.0.0-beta.51...v1.0.0-beta.52) (2024-12-18)


### Bug Fixes

* **themes:** increase default retries in jobPollStatus ([b381fe9](https://github.com/zendesk/zcli/commit/b381fe9fb1100e596668232f85408ab426f807a1))





# [1.0.0-beta.51](https://github.com/zendesk/zcli/compare/v1.0.0-beta.50...v1.0.0-beta.51) (2024-09-29)


### Reverts

* Revert "venus" ([cbc6aaa](https://github.com/zendesk/zcli/commit/cbc6aaa6b74a393b13caba603398899d35489e94))





# [1.0.0-beta.50](https://github.com/zendesk/zcli/compare/v1.0.0-beta.49...v1.0.0-beta.50) (2024-09-06)


### Bug Fixes

* module resolution ([#262](https://github.com/zendesk/zcli/issues/262)) ([12a08ce](https://github.com/zendesk/zcli/commit/12a08ce1b801acb062231be2db158d8e51a9d40e))





# [1.0.0-beta.49](https://github.com/zendesk/zcli/compare/v1.0.0-beta.48...v1.0.0-beta.49) (2024-09-05)


### Bug Fixes

* bump timeout for tests ([024c486](https://github.com/zendesk/zcli/commit/024c4861fe3d6321e7328f85f503e2dd57493196))





# [1.0.0-beta.48](https://github.com/zendesk/zcli/compare/v1.0.0-beta.47...v1.0.0-beta.48) (2024-09-03)


### Features

* **apps:update:** add ability to use ZENDESK_APP_ID env var during apps:update ([#254](https://github.com/zendesk/zcli/issues/254)) ([a14e3fe](https://github.com/zendesk/zcli/commit/a14e3fe2333b8fcf00e8b76654e79054337315ed))





# [1.0.0-beta.47](https://github.com/zendesk/zcli/compare/v1.0.0-beta.46...v1.0.0-beta.47) (2024-08-05)


### Bug Fixes

* failing unit test ([eede77d](https://github.com/zendesk/zcli/commit/eede77d63514a69ff0725a40065ccf00e90da3ec))
* fix unit and functional tests ([e4eb869](https://github.com/zendesk/zcli/commit/e4eb8695e80bba5a397e7d2390accd65d71b9dd4))
* handle compilation errors for lighten and darken functions ([a45f319](https://github.com/zendesk/zcli/commit/a45f31943fdaf1032951111516a78746380fafde))
* inconsistent behaviour when ZENDESK_DOMAIN env is set ([7d1f234](https://github.com/zendesk/zcli/commit/7d1f234852dec793953e443879ddced7b5851710))
* replace all instances of lighten and darken functions ([b828b9c](https://github.com/zendesk/zcli/commit/b828b9cc2a28ff8107d6ca84e00dd4ebca85f78c))
* webpack unit test to use vite ([e5c81cf](https://github.com/zendesk/zcli/commit/e5c81cfb21612fcd5fadd2c3f4aee27d0df620ba))


### Features

* change login to use api token ([415b5e1](https://github.com/zendesk/zcli/commit/415b5e19ddb164f70cf6d74d5f9f48f802612473))
* replace term password with secret ([e0c2aaa](https://github.com/zendesk/zcli/commit/e0c2aaa0543b4ae7ccfe69245538ab29701688df))
* update help message to refer only the api token ([97f6ce9](https://github.com/zendesk/zcli/commit/97f6ce9a7a416f233b994b572c844e34c9a24400))





# [1.0.0-beta.46](https://github.com/zendesk/zcli/compare/v1.0.0-beta.45...v1.0.0-beta.46) (2024-07-15)

**Note:** Version bump only for package zcli-monorepo





# [1.0.0-beta.45](https://github.com/zendesk/zcli/compare/v1.0.0-beta.44...v1.0.0-beta.45) (2024-07-15)

**Note:** Version bump only for package zcli-monorepo





# [1.0.0-beta.44](https://github.com/zendesk/zcli/compare/v1.0.0-beta.43...v1.0.0-beta.44) (2024-07-15)

**Note:** Version bump only for package zcli-monorepo





# [1.0.0-beta.43](https://github.com/zendesk/zcli/compare/v1.0.0-beta.42...v1.0.0-beta.43) (2024-07-10)


### Bug Fixes

* node 14 doesn’t have any arm64 builds, upgrade to 18 ([84cedfe](https://github.com/zendesk/zcli/commit/84cedfee1a1b9621679c4842a9430509dc1ed949))
* use the baseUrl from the request api call ([e7e2552](https://github.com/zendesk/zcli/commit/e7e255282939fe18b087c6a94ae422ff5a6db7b5))





# [1.0.0-beta.42](https://github.com/zendesk/zcli/compare/v1.0.0-beta.40...v1.0.0-beta.42) (2024-04-24)

**Note:** Version bump only for package zcli-monorepo





# [1.0.0-beta.41](https://github.com/zendesk/zcli/compare/v1.0.0-beta.40...v1.0.0-beta.41) (2024-04-24)

**Note:** Version bump only for package zcli-monorepo





# [1.0.0-beta.40](https://github.com/zendesk/zcli/compare/v1.0.0-beta.39...v1.0.0-beta.40) (2024-01-24)


### Bug Fixes

* bump glob version ([957c5b3](https://github.com/zendesk/zcli/commit/957c5b3c3c78ed26155dd2f6d1162ad817740eda))
* convert Windows paths to POSIX format ([a6f8743](https://github.com/zendesk/zcli/commit/a6f87437036dfcbb1accd30c12eb664d5f7c3db0))
* enforce posix separator in glob result to match split pattern ([9e3f629](https://github.com/zendesk/zcli/commit/9e3f629e5ad9d9d9aab8292f49f4e7b52649e093))
* update yarn.lock ([c083a59](https://github.com/zendesk/zcli/commit/c083a593b8cb46d7b057d36cac5f2a706e9fda61))





# [1.0.0-beta.39](https://github.com/zendesk/zcli/compare/v1.0.0-beta.38...v1.0.0-beta.39) (2023-10-18)


### Bug Fixes

* improve 'themes' error handling ([73820c1](https://github.com/zendesk/zcli/commit/73820c1a596e0838ac39b0db441e0ab420a81683))


### Features

* **themes:** Added options for starting the preview mode in HTTPS ([fcf7a88](https://github.com/zendesk/zcli/commit/fcf7a8830b2343fe586c7bb3c749fa0ee28acc5b))





# [1.0.0-beta.38](https://github.com/zendesk/zcli/compare/v1.0.0-beta.37...v1.0.0-beta.38) (2023-08-08)


### Bug Fixes

* fixed imports for getAccount and getProfileAccount ([f38c5d1](https://github.com/zendesk/zcli/commit/f38c5d1a28ecadb51596de2b5c65f3247e382a91))





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
* adding support for zcli:theme preview ([918bff3](https://github.com/zendesk/zcli/commit/918bff36b87a93dbcf9d8994db07866b7820bda7))





# [1.0.0-beta.33](https://github.com/zendesk/zcli/compare/v1.0.0-beta.32...v1.0.0-beta.33) (2023-05-26)


### Features

* adding support for zcli:theme preview ([918bff3](https://github.com/zendesk/zcli/commit/918bff36b87a93dbcf9d8994db07866b7820bda7))





# [1.0.0-beta.32](https://github.com/zendesk/zcli/compare/v1.0.0-beta.31...v1.0.0-beta.32) (2023-02-14)


### Bug Fixes

* Fix apps:update and apps:server for requirements-only apps ([72ea302](https://github.com/zendesk/zcli/commit/72ea3026afe78d8f66d80e6183bfed0aedc86ead))





# [1.0.0-beta.31](https://github.com/zendesk/zcli/compare/v1.0.0-beta.30...v1.0.0-beta.31) (2023-02-05)


### Bug Fixes

* Do not check manifest.location for requirements-only apps ([97be95f](https://github.com/zendesk/zcli/commit/97be95f5e2ef8706fccf0fd77a53d4ba6c86e3c0))





# [1.0.0-beta.30](https://github.com/zendesk/zcli/compare/v1.0.0-beta.29...v1.0.0-beta.30) (2023-01-31)


### Bug Fixes

* Pin all oclif dependencies to exact versions ([622553f](https://github.com/zendesk/zcli/commit/622553fa07625d79cbd67537253431c42841b1c0))





# [1.0.0-beta.29](https://github.com/zendesk/zcli/compare/v1.0.0-beta.28...v1.0.0-beta.29) (2023-01-23)


### Bug Fixes

* Pin [@oclif](https://github.com/oclif) plugins' minor versions ([3c73b53](https://github.com/zendesk/zcli/commit/3c73b5334e5604ba5c3ed40eb8eb76a758b3c0c3)), closes [/github.com/oclif/plugin-plugins/blob/ee03e0f7ead2f1e6bf0ac03694314080367bbfd9/package.json#L9](https://github.com//github.com/oclif/plugin-plugins/blob/ee03e0f7ead2f1e6bf0ac03694314080367bbfd9/package.json/issues/L9)





# [1.0.0-beta.28](https://github.com/zendesk/zcli/compare/v1.0.0-beta.27...v1.0.0-beta.28) (2022-11-28)

**Note:** Version bump only for package zcli-monorepo





# [1.0.0-beta.27](https://github.com/zendesk/zcli/compare/v1.0.0-beta.26...v1.0.0-beta.27) (2022-11-22)

**Note:** Version bump only for package zcli-monorepo





# [1.0.0-beta.26](https://github.com/zendesk/zcli/compare/v1.0.0-beta.24...v1.0.0-beta.26) (2022-11-21)


### Reverts

* Revert "Revert "Zcli package ignore" (#144)" ([75e859c](https://github.com/zendesk/zcli/commit/75e859cf85a6f706085f194883a242217430e525)), closes [#144](https://github.com/zendesk/zcli/issues/144)





# [1.0.0-beta.25](https://github.com/zendesk/zcli/compare/v1.0.0-beta.24...v1.0.0-beta.25) (2022-11-21)


### Reverts

* Revert "Revert "Zcli package ignore" (#144)" ([75e859c](https://github.com/zendesk/zcli/commit/75e859cf85a6f706085f194883a242217430e525)), closes [#144](https://github.com/zendesk/zcli/issues/144)





# [1.0.0-beta.24](https://github.com/zendesk/zcli/compare/v1.0.0-beta.23...v1.0.0-beta.24) (2022-09-20)


### Bug Fixes

* Pin TypeScript to <4.8 to avoid oclif/core error ([0a7a2bb](https://github.com/zendesk/zcli/commit/0a7a2bbf600a8768871bd226131df94db6956c79))
* Set up local ts-node stub for development ([c5d0933](https://github.com/zendesk/zcli/commit/c5d09335c487794f1a2377517c5c3a1805f295c0))
* Tweak yarn link:bin for Cygwin ([8961db8](https://github.com/zendesk/zcli/commit/8961db8eff7d2482b14f9f182c618374c86e2a2a))


### Reverts

* Revert "Always publish to npmjs.com main public registry (#132)" (#134) ([c58ffb0](https://github.com/zendesk/zcli/commit/c58ffb033cea0a75c76ffb0c2353e17146c8d5d4)), closes [#132](https://github.com/zendesk/zcli/issues/132) [#134](https://github.com/zendesk/zcli/issues/134)





# [1.0.0-beta.23](https://github.com/zendesk/zcli/compare/v1.0.0-beta.22...v1.0.0-beta.23) (2022-08-01)

**Note:** Version bump only for package zcli-monorepo





# [1.0.0-beta.22](https://github.com/zendesk/zcli/compare/v1.0.0-beta.21...v1.0.0-beta.22) (2022-08-01)

**Note:** Version bump only for package zcli-monorepo





# [1.0.0-beta.21](https://github.com/zendesk/zcli/compare/v1.0.0-beta.20...v1.0.0-beta.21) (2022-08-01)

**Note:** Version bump only for package zcli-monorepo





# [1.0.0-beta.20](https://github.com/zendesk/zcli/compare/v1.0.0-beta.19...v1.0.0-beta.20) (2022-08-01)

**Note:** Version bump only for package zcli-monorepo





# [1.0.0-beta.19](https://github.com/zendesk/zcli/compare/v1.0.0-beta.18...v1.0.0-beta.19) (2022-07-26)

**Note:** Version bump only for package zcli-monorepo





# [1.0.0-beta.18](https://github.com/zendesk/zcli/compare/v1.0.0-beta.17...v1.0.0-beta.18) (2022-05-24)

**Note:** Version bump only for package zcli-monorepo





# [1.0.0-beta.17](https://github.com/zendesk/zcli/compare/v1.0.0-beta.16...v1.0.0-beta.17) (2022-05-04)

**Note:** Version bump only for package zcli-monorepo





# [1.0.0-beta.16](https://github.com/zendesk/zcli/compare/v1.0.0-beta.15...v1.0.0-beta.16) (2022-02-24)

**Note:** Version bump only for package zcli-monorepo





# [1.0.0-beta.15](https://github.com/zendesk/zcli/compare/v1.0.0-beta.14...v1.0.0-beta.15) (2021-12-06)


### Bug Fixes

* upgrade adm-zip from 0.5.5 to 0.5.6 ([#77](https://github.com/zendesk/zcli/issues/77)) ([03337c5](https://github.com/zendesk/zcli/commit/03337c5569c4a5d1aa66ad3fe319cd49b3fcf41c))





# [1.0.0-beta.14](https://github.com/zendesk/zcli/compare/v1.0.0-beta.13...v1.0.0-beta.14) (2021-11-23)


### Bug Fixes

* parse subdomain even when hostname is provided ([a3e69e6](https://github.com/zendesk/zcli/commit/a3e69e6d0525a4755f8027a486647c4321c5d0a6))





# [1.0.0-beta.13](https://github.com/zendesk/zcli/compare/v1.0.0-beta.12...v1.0.0-beta.13) (2021-11-22)

**Note:** Version bump only for package zcli-monorepo





# [1.0.0-beta.12](https://github.com/zendesk/zcli/compare/v1.0.0-beta.11...v1.0.0-beta.12) (2021-11-22)


### Bug Fixes

* **re-release:** force release ([191a479](https://github.com/zendesk/zcli/commit/191a479c30dca2fd20a1772cdece983d9838e9c8))
* **release:** add missing next line ([d34cdab](https://github.com/zendesk/zcli/commit/d34cdabd10113580ae30eb8a3bb10380f7d88b30))





# [1.0.0-beta.11](https://github.com/zendesk/zcli/compare/v1.0.0-beta.10...v1.0.0-beta.11) (2021-11-21)

**Note:** Version bump only for package zcli-monorepo





# [1.0.0-beta.10](https://github.com/zendesk/zcli/compare/v1.0.0-beta.8...v1.0.0-beta.10) (2021-11-10)


### Bug Fixes

* packages/zcli-apps/package.json to reduce vulnerabilities ([9fc51a4](https://github.com/zendesk/zcli/commit/9fc51a4b9f33655c4e0ecaccefa08a948625a3fa))
* packages/zcli/package.json to reduce vulnerabilities ([18b8d5d](https://github.com/zendesk/zcli/commit/18b8d5d80f6adb2508703ccf2332f146db6a4833))
* packages/zcli/package.json to reduce vulnerabilities ([e763037](https://github.com/zendesk/zcli/commit/e76303702b4fa42c7b7fe13be7babd78fc576d74))
* upgrade @oclif/plugin-autocomplete from 0.2.0 to 0.3.0 ([ad84782](https://github.com/zendesk/zcli/commit/ad84782db2d9ae58226abb79c0fc8e1fe426b3ad))
* upgrade @oclif/plugin-update from 1.3.10 to 1.5.0 ([1b41cb0](https://github.com/zendesk/zcli/commit/1b41cb0e9dad291f9dc1f912940213b89f85775e))
* upgrade adm-zip from 0.5.2 to 0.5.5 ([bf9bcce](https://github.com/zendesk/zcli/commit/bf9bcce5fe52334374f7d4b71107e228ec84ed52))
* upgrade chalk from 4.1.0 to 4.1.1 ([bfc604c](https://github.com/zendesk/zcli/commit/bfc604cc5747ea5e43d1877df4ea8c52cc61e350))
* upgrade chalk from 4.1.1 to 4.1.2 ([ac60a7d](https://github.com/zendesk/zcli/commit/ac60a7d84e127830c518f65da8138842f2135c67))
* upgrade cli-ux from 5.5.1 to 5.6.2 ([665b08e](https://github.com/zendesk/zcli/commit/665b08e1cac5ddf11df9b8c86f38e63299e191cc))
* upgrade form-data from 3.0.0 to 3.0.1 ([92e3011](https://github.com/zendesk/zcli/commit/92e3011a623a3b9bf6bf5c6f21dd3aeedcc499fe))
* upgrade fs-extra from 9.0.1 to 9.1.0 ([0ad6812](https://github.com/zendesk/zcli/commit/0ad6812a8286a36abe4dfe952e19f6c324d8a5f2))





# 1.0.0-beta.9 (2021-11-09)

**Note:** Version bump only for package zcli-monorepo





# [1.0.0-beta.8](https://github.com/zendesk/zcli/compare/v1.0.0-beta.7...v1.0.0-beta.8) (2021-03-13)

**Note:** Version bump only for package zcli-monorepo





# [1.0.0-beta.7](https://github.com/zendesk/zcli/compare/v1.0.0-beta.6...v1.0.0-beta.7) (2021-03-11)

**Note:** Version bump only for package zcli-monorepo





# [1.0.0-beta.6](https://github.com/zendesk/zcli/compare/v1.0.0-beta.5...v1.0.0-beta.6) (2021-02-14)

**Note:** Version bump only for package zcli-monorepo





# [1.0.0-beta.5](https://github.com/zendesk/zcli/compare/v1.0.0-beta.4...v1.0.0-beta.5) (2021-02-04)


### Bug Fixes

* upgrade @oclif/plugin-autocomplete from 0.2.0 to 0.2.1 ([3647d52](https://github.com/zendesk/zcli/commit/3647d52e123f7db6d4ff612e0cb45752d5125f5a))
* upgrade adm-zip from 0.4.16 to 0.5.0 ([f4b2eee](https://github.com/zendesk/zcli/commit/f4b2eee180af6a08ee6400e98c85eb1b5fe2bfff))
* upgrade adm-zip from 0.5.0 to 0.5.1 ([321b0b6](https://github.com/zendesk/zcli/commit/321b0b61bcf6e3f5d95c7a23485fb23a9bf26b2b))
* upgrade cli-ux from 5.4.9 to 5.4.10 ([af4857c](https://github.com/zendesk/zcli/commit/af4857cb61a4807dbe17838cd4d0fa2f34d1e569))
* upgrade cli-ux from 5.4.9 to 5.5.0 ([1bd2ba3](https://github.com/zendesk/zcli/commit/1bd2ba3a7dd8d88432cdc24ca86b74178700ae35))
* upgrade tslib from 1.13.0 to 1.14.0 ([6215424](https://github.com/zendesk/zcli/commit/6215424ad344f10361cf9e37773d09574013d2bd))
* upgrade tslib from 1.13.0 to 1.14.1 ([6e60872](https://github.com/zendesk/zcli/commit/6e608720c6b86ea98f1521dc70bc50d5fa659e5a))





# [1.0.0-beta.4](https://github.com/zendesk/zcli/compare/v1.0.0-beta.3...v1.0.0-beta.4) (2020-08-11)

**Note:** Version bump only for package zcli-monorepo





# [1.0.0-beta.3](https://github.com/zendesk/zcli/compare/v1.0.0-beta.2...v1.0.0-beta.3) (2020-08-10)


### Bug Fixes

* upgrade archiver from 4.0.1 to 4.0.2 ([7179778](https://github.com/zendesk/zcli/commit/717977863aa01904ff776ae494c497c3456aa9ec))
* upgrade chalk from 4.0.0 to 4.1.0 ([fd3e13e](https://github.com/zendesk/zcli/commit/fd3e13ee05771ebb1a00f03de0a806c704e7362a))
* upgrade uuid from 7.0.2 to 7.0.3 ([55cf92b](https://github.com/zendesk/zcli/commit/55cf92becf791e460a54078dd856c9af8f528aca))





# 1.0.0-beta.2 (2020-08-04)

**Note:** Version bump only for package zcli-monorepo





# 1.0.0-beta.1 (2020-08-04)

**Note:** Version bump only for package zcli-monorepo





# Change Log
