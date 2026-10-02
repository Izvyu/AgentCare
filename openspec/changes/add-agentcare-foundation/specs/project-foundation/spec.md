## ADDED Requirements

### Requirement: Agent-facing repository guide
The repository SHALL maintain a root `AGENTS.md` that maps the AgentCare UI, API, API tests, migration library, migration CLI, CI, and OpenSpec change to their folder responsibilities and directs agents to the relevant specification and SSO boundary documents.

#### Scenario: Read the guide before scaffold implementation
- **WHEN** an agent inspects `AGENTS.md` before the application folders exist
- **THEN** the guide marks those paths as planned and points to `openspec/changes/add-agentcare-foundation/`

#### Scenario: Read the guide after scaffold implementation
- **WHEN** the application folders are created
- **THEN** the guide's folder map matches the actual repository layout

### Requirement: Isolated AgentCare workspace
The repository SHALL provide independently configurable React and .NET applications with AgentCare-specific paths, browser storage, Cookie identity, and local development commands.

#### Scenario: Start locally
- **WHEN** the developer runs the root start command with valid local configuration and free ports
- **THEN** the API becomes healthy before the UI starts on the configured ports
- **AND** no database migration runs as a side effect of startup

#### Scenario: Port belongs to another project
- **WHEN** AgentCare's configured port is already used by another process
- **THEN** start reports the conflict and stop does not terminate that process

### Requirement: Explicit AgentCare migrations
The project SHALL provide read-only status and validation commands and an explicit FluentMigrator command whose target is only the AgentCare database.

#### Scenario: Inspect migration state
- **WHEN** an operator runs status or validation
- **THEN** no database object or data is changed

#### Scenario: Apply initial migration
- **WHEN** the operator completes preflight and explicitly runs migrate against the empty AgentCare database
- **THEN** the AgentCare-owned login query procedures and migration history are created
- **AND** no SSO schema or authorization data is changed

### Requirement: Build-only continuous integration
The repository SHALL run frontend, API, and migration tests and builds without requiring live database credentials or deploying the application.

#### Scenario: CI run
- **WHEN** CI runs on a change
- **THEN** it reports test and build results without applying migrations or changing IIS
