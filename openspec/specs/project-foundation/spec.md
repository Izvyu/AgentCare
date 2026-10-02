# project-foundation Specification

## Purpose
Define AgentCare's repository map, isolated local startup, explicit database migration workflow, and build-only CI.
## Requirements
### Requirement: Agent-facing repository guide
The repository SHALL maintain a root `AGENTS.md` that maps the AgentCare UI, API, API tests, migration library, migration CLI, CI, current OpenSpec specs, and archived foundation change to their folder responsibilities and directs agents to the relevant specification and SSO boundary documents.

#### Scenario: Read the guide after foundation archival
- **WHEN** an agent inspects `AGENTS.md`
- **THEN** the folder map matches the actual repository layout and points to `openspec/specs/` for current requirements
- **AND** the foundation's design and verification history is discoverable in `openspec/changes/archive/2026-10-02-add-agentcare-foundation/`

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
