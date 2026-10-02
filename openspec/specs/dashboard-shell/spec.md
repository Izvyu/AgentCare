# dashboard-shell Specification

## Purpose
Define the AgentCare login and Dashboard interactions, including company context and SSO-driven navigation.
## Requirements
### Requirement: Reference-aligned login page
The UI SHALL provide the AssetMgmt_UI-aligned two-column AgentCare login with company Autocomplete, account, password visibility, locale selection, account/company remembrance, and placeholder support/footer links without storing credentials.

#### Scenario: Required fields
- **WHEN** the user submits an incomplete form
- **THEN** the missing company, account, and password messages appear below their matching controls

#### Scenario: Backend login rejection
- **WHEN** the API rejects credentials with a message
- **THEN** a Snackbar shows the API message rather than an HTTP client status string

### Requirement: Authorized dashboard context
The dashboard SHALL keep Home as its first non-closeable tab and allow the user to switch only among companies returned as authorized by the session.

#### Scenario: Company switch
- **WHEN** the user selects another authorized company
- **THEN** the current company displayed in the brand area changes without requiring a new login

#### Scenario: Home tab
- **WHEN** the dashboard opens or all closeable tabs are closed
- **THEN** the fixed Home tab remains and renders ComingSoon

### Requirement: SSO-driven navigation
The Sidebar SHALL render only SSO tree items, search with the SSO search list, and preserve menu identity and permissions in opened tabs.

#### Scenario: Search and open
- **WHEN** the user searches and opens a matching menu item
- **THEN** matching text in the search list and Autocomplete options is green and bold
- **AND** the tab retains its function, component, SideMenuID, and Auth data

#### Scenario: Unknown component
- **WHEN** an SSO item names a missing or unknown component
- **THEN** its tab renders ComingSoon without fabricating a business page

#### Scenario: Menu unavailable
- **WHEN** the menu is loading, empty, or fails to load
- **THEN** the UI shows the matching state and offers retry after failure

### Requirement: Usable dashboard controls
The dashboard SHALL provide responsive Sidebar collapse, TopBar tabs, locale and theme controls, password change, and Sidebar-footer logout without displaying fabricated menu or notification data.

#### Scenario: Collapse Sidebar
- **WHEN** the desktop Sidebar closes
- **THEN** its width and minimum width are zero and the main area expands

#### Scenario: TopBar controls
- **WHEN** the dashboard displays the TopBar
- **THEN** the user name is visible directly, tab options are beside notifications, and the Sidebar open control is hidden while the desktop Sidebar is open

#### Scenario: Logout
- **WHEN** the user logs out
- **THEN** AgentCare clears its own browser session state and returns to login
