# Changelog

## [0.3.0](https://github.com/GV94/planning-poker/compare/v0.2.3...v0.3.0) (2026-03-31)


### Features

* add e2e test suite for lobby server API ([#2](https://github.com/GV94/planning-poker/issues/2)) ([d56dd26](https://github.com/GV94/planning-poker/commit/d56dd26c5e46a6bc2545247652123fced13e0169))
* add logo assets and update favicon ([ca1dfc2](https://github.com/GV94/planning-poker/commit/ca1dfc2a07867ec4fcae56e9256558ffb8537535))
* add turnstile captcha ([ac83f88](https://github.com/GV94/planning-poker/commit/ac83f88083a6fa1e6bf63ef65dcc834d0fddde65))
* enhance lobby synchronization by including clientId in sync actions ([bd75c90](https://github.com/GV94/planning-poker/commit/bd75c90ca3d36aed38c748db0055e99732e23602))
* implement event tracking for lobby creation and joining ([1d80fff](https://github.com/GV94/planning-poker/commit/1d80fff526c5c66f7200ca4efd8c23e25431fa3c))
* implement lobby synchronization feature with new sync action and types ([5c63777](https://github.com/GV94/planning-poker/commit/5c63777830fd53c382960c9aac5094f500c653d4))
* **web:** show vote stats (min, max, median, avg) on reveal ([#17](https://github.com/GV94/planning-poker/issues/17)) ([8fc9bde](https://github.com/GV94/planning-poker/commit/8fc9bde745f658c3516b566102c1784205a8d103))


### Bug Fixes

* layout was forced to desktop mode even on mobile ([5c807d0](https://github.com/GV94/planning-poker/commit/5c807d02d4f51b6e9974eefa9cec367484ba022c))
* root.tsx was incorrect, various project file fixes ([ff14301](https://github.com/GV94/planning-poker/commit/ff1430194d497e9a6813ef6b3b9306f3aa6726d9))
* skip captcha verification for rejoining participants ([d62db67](https://github.com/GV94/planning-poker/commit/d62db677ebb341892bc6ace2382e3ad2af5a1d40))
* **web:** improve loading UX for slow networks ([#11](https://github.com/GV94/planning-poker/issues/11)) ([8403fa3](https://github.com/GV94/planning-poker/commit/8403fa31b878835c274efec9a8b0b71d1e5b1aad))
* **web:** prevent WakeUpOverlay from rendering when mounted invisible ([#6](https://github.com/GV94/planning-poker/issues/6)) ([1c2799e](https://github.com/GV94/planning-poker/commit/1c2799e4bca72a9465767aed9f6f98c496063cff))
* **web:** proxy GoatCounter through own domain to bypass ad blockers ([#13](https://github.com/GV94/planning-poker/issues/13)) ([da30bac](https://github.com/GV94/planning-poker/commit/da30bac3d5709e244bb56ddc9d1759550c6c78dc))


### Chores

* **main:** release 0.2.0 ([#5](https://github.com/GV94/planning-poker/issues/5)) ([0d5f207](https://github.com/GV94/planning-poker/commit/0d5f2077d13bf053ddd8219310349b21797f2759))
* **main:** release 0.2.1 ([#9](https://github.com/GV94/planning-poker/issues/9)) ([3900e4d](https://github.com/GV94/planning-poker/commit/3900e4d169e34deb4450d693598a69ff685fb9f5))
* **main:** release 0.2.2 ([#12](https://github.com/GV94/planning-poker/issues/12)) ([e61a4f9](https://github.com/GV94/planning-poker/commit/e61a4f97d545b7df8102ea8180f311b5b5d97127))
* **main:** release 0.2.3 ([#14](https://github.com/GV94/planning-poker/issues/14)) ([35f3a30](https://github.com/GV94/planning-poker/commit/35f3a30cb511dbdbd2a0bbcd22e13bdd05a844cf))


### Refactoring

* **ci:** split test targets into unit-test and e2e-test ([#3](https://github.com/GV94/planning-poker/issues/3)) ([66cff66](https://github.com/GV94/planning-poker/commit/66cff66d9419e36a10019461cfed456448eab344))
* rename p2p-manager to lobby-server ([103d400](https://github.com/GV94/planning-poker/commit/103d40089dd269cecaf0638c59bc8e539fed8e3e))


### Tests

* add 100% unit test coverage for lobby-server API ([#1](https://github.com/GV94/planning-poker/issues/1)) ([2b7841e](https://github.com/GV94/planning-poker/commit/2b7841e89f08fd6075e3480a657752dbcdd1df48))


### CI

* add release-please workflow and enforce conventional commits ([38e712e](https://github.com/GV94/planning-poker/commit/38e712e2f9a10b088dbcac6f3d42a4f6cf94d063))
* add workflow_dispatch trigger to release workflow ([59cdfd5](https://github.com/GV94/planning-poker/commit/59cdfd50bf53e136d27c7ae4a67d2b9b55615ee0))

## [0.2.3](https://github.com/GV94/planning-poker/compare/v0.2.2...v0.2.3) (2026-03-29)


### Bug Fixes

* **web:** proxy GoatCounter through own domain to bypass ad blockers ([#13](https://github.com/GV94/planning-poker/issues/13)) ([da30bac](https://github.com/GV94/planning-poker/commit/da30bac3d5709e244bb56ddc9d1759550c6c78dc))

## [0.2.2](https://github.com/GV94/planning-poker/compare/v0.2.1...v0.2.2) (2026-03-25)


### Bug Fixes

* **web:** improve loading UX for slow networks ([#11](https://github.com/GV94/planning-poker/issues/11)) ([8403fa3](https://github.com/GV94/planning-poker/commit/8403fa31b878835c274efec9a8b0b71d1e5b1aad))

## [0.2.1](https://github.com/GV94/planning-poker/compare/v0.2.0...v0.2.1) (2026-03-24)


### Bug Fixes

* **web:** prevent WakeUpOverlay from rendering when mounted invisible ([#6](https://github.com/GV94/planning-poker/issues/6)) ([1c2799e](https://github.com/GV94/planning-poker/commit/1c2799e4bca72a9465767aed9f6f98c496063cff))

## [0.2.0](https://github.com/GV94/planning-poker/compare/v0.1.0...v0.2.0) (2026-03-24)


### Features

* add e2e test suite for lobby server API ([#2](https://github.com/GV94/planning-poker/issues/2)) ([d56dd26](https://github.com/GV94/planning-poker/commit/d56dd26c5e46a6bc2545247652123fced13e0169))
* add logo assets and update favicon ([ca1dfc2](https://github.com/GV94/planning-poker/commit/ca1dfc2a07867ec4fcae56e9256558ffb8537535))
* add turnstile captcha ([ac83f88](https://github.com/GV94/planning-poker/commit/ac83f88083a6fa1e6bf63ef65dcc834d0fddde65))
* enhance lobby synchronization by including clientId in sync actions ([bd75c90](https://github.com/GV94/planning-poker/commit/bd75c90ca3d36aed38c748db0055e99732e23602))
* implement event tracking for lobby creation and joining ([1d80fff](https://github.com/GV94/planning-poker/commit/1d80fff526c5c66f7200ca4efd8c23e25431fa3c))
* implement lobby synchronization feature with new sync action and types ([5c63777](https://github.com/GV94/planning-poker/commit/5c63777830fd53c382960c9aac5094f500c653d4))


### Bug Fixes

* layout was forced to desktop mode even on mobile ([5c807d0](https://github.com/GV94/planning-poker/commit/5c807d02d4f51b6e9974eefa9cec367484ba022c))
* root.tsx was incorrect, various project file fixes ([ff14301](https://github.com/GV94/planning-poker/commit/ff1430194d497e9a6813ef6b3b9306f3aa6726d9))
* skip captcha verification for rejoining participants ([d62db67](https://github.com/GV94/planning-poker/commit/d62db677ebb341892bc6ace2382e3ad2af5a1d40))


### Refactoring

* **ci:** split test targets into unit-test and e2e-test ([#3](https://github.com/GV94/planning-poker/issues/3)) ([66cff66](https://github.com/GV94/planning-poker/commit/66cff66d9419e36a10019461cfed456448eab344))
* rename p2p-manager to lobby-server ([103d400](https://github.com/GV94/planning-poker/commit/103d40089dd269cecaf0638c59bc8e539fed8e3e))


### Tests

* add 100% unit test coverage for lobby-server API ([#1](https://github.com/GV94/planning-poker/issues/1)) ([2b7841e](https://github.com/GV94/planning-poker/commit/2b7841e89f08fd6075e3480a657752dbcdd1df48))


### CI

* add release-please workflow and enforce conventional commits ([38e712e](https://github.com/GV94/planning-poker/commit/38e712e2f9a10b088dbcac6f3d42a4f6cf94d063))
* add workflow_dispatch trigger to release workflow ([59cdfd5](https://github.com/GV94/planning-poker/commit/59cdfd50bf53e136d27c7ae4a67d2b9b55615ee0))
