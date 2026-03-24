## ADDED Requirements

### Requirement: Coverage collection during e2e tests
The Vitest configuration for the e2e test project SHALL support collecting server-side code coverage via `@vitest/coverage-v8` when run with the `--coverage` flag.

#### Scenario: Run tests with coverage
- **WHEN** the e2e tests are run with `--coverage`
- **THEN** a coverage report SHALL be generated for the lobby server source files (`apps/lobby-server/src/**`)

#### Scenario: Run tests without coverage
- **WHEN** the e2e tests are run without the `--coverage` flag
- **THEN** no coverage report SHALL be generated and test execution speed SHALL not be affected

### Requirement: Coverage report output
The coverage report SHALL be written to `coverage/lobby-server-e2e/` and SHALL support text (terminal summary) and lcov (for CI integration) reporters.

#### Scenario: Coverage report location
- **WHEN** tests complete with coverage enabled
- **THEN** the coverage report SHALL exist at `coverage/lobby-server-e2e/`
- **AND** the terminal SHALL display a summary table with file-level coverage percentages

#### Scenario: Lcov output for CI tools
- **WHEN** tests complete with coverage enabled
- **THEN** an `lcov.info` file SHALL be present in the coverage output directory

### Requirement: Coverage scope limited to server source
Coverage collection SHALL only measure files under `apps/lobby-server/src/` and SHALL exclude test files, node_modules, and other apps.

#### Scenario: Coverage includes only server files
- **WHEN** the coverage report is generated
- **THEN** it SHALL only include files matching `apps/lobby-server/src/**/*.ts`
- **AND** it SHALL NOT include test files or files from other apps

### Requirement: Coverage script in package.json
A convenience script SHALL exist in the root `package.json` for running e2e tests with coverage.

#### Scenario: Run coverage via script
- **WHEN** `pnpm e2e:lobby:coverage` is run
- **THEN** the e2e tests SHALL execute with coverage collection enabled and a report SHALL be produced
