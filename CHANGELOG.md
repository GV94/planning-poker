# Changelog

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
