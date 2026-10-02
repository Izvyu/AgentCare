## ADDED Requirements

### Requirement: AgentCare company scope
The application SHALL offer companies from the AgentCare SSO company group and permit a signed-in user to work only within their authorized companies.

#### Scenario: Public company choices
- **WHEN** the login page requests companies
- **THEN** it receives only companies in GroupId 3

#### Scenario: Unauthorized company selection
- **WHEN** valid credentials are submitted with a company outside the user's AgentCare authorization
- **THEN** login returns 403 without issuing a session Cookie

### Requirement: Single-role SSO login and session
The application SHALL authenticate against SSO ApplicationID 12 and issue an AgentCare-specific HttpOnly JWT Cookie only for a user with exactly one distinct AgentCare role and an authorized selected company.

#### Scenario: Successful login
- **WHEN** valid credentials, one AgentCare role, and an authorized company are supplied
- **THEN** the API returns the user and authorized company list and sets the AgentCare Cookie

#### Scenario: Invalid credentials
- **WHEN** the account or password is invalid
- **THEN** login returns 401 with a user-readable message and no Cookie

#### Scenario: Multiple AgentCare roles
- **WHEN** a user has multiple distinct roles for ApplicationID 12
- **THEN** login returns 409 with a request to correct the SSO assignment and no Cookie

#### Scenario: Restore session
- **WHEN** a valid AgentCare Cookie is presented
- **THEN** the session endpoint returns the current user and authorized companies
- **AND** an invalid or revoked session returns 401

### Requirement: Role-scoped dynamic menu
The application SHALL return the signed-in role's SSO menu tree and search list, preserving each item's identity, component name, function name, and action permissions.

#### Scenario: Authorized menu request
- **WHEN** a signed-in user requests the role ID in their JWT
- **THEN** the response contains `data.rows`, `data.rows2`, and per-menu `Auth`

#### Scenario: Role mismatch
- **WHEN** the requested role ID differs from the authenticated role
- **THEN** the API returns 403 without returning the other role's menu

#### Scenario: Missing authentication
- **WHEN** a menu request has no valid AgentCare session
- **THEN** the API returns 401

### Requirement: Narrow SSO password change
The application SHALL let a signed-in user change only their own SSO password by supplying the old password and confirming the new password.

#### Scenario: Successful change
- **WHEN** the old password is correct and the new password passes validation
- **THEN** SSO updates that user's password and the current AgentCare session remains active

#### Scenario: Invalid old password
- **WHEN** the old password does not match
- **THEN** the API returns a useful error and does not change the password

### Requirement: Session logout
The application SHALL remove only its own authentication Cookie when the user logs out.

#### Scenario: Logout
- **WHEN** a signed-in user logs out
- **THEN** their AgentCare Cookie is removed and protected AgentCare endpoints require login again
