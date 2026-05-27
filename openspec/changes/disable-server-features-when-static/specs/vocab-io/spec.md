## ADDED Requirements

### Requirement: Developer Server Detection
The system SHALL perform a non-blocking check on application load to dynamically detect if the local developer Node/Vite backend server is running and responsive.

#### Scenario: Local developer server is active
- **WHEN** the application loads and successfully fetches a lightweight response from the backend health check `/api/health` within 600ms
- **THEN** the system SHALL set the server availability status to active, display a connection badge indicating "Dev Connected", and enable server-dependent features

#### Scenario: Local developer server is inactive
- **WHEN** the application loads and the health check `/api/health` fails or takes longer than 600ms to respond
- **THEN** the system SHALL silently catch the failure, set the server availability status to inactive, and disable/hide server-dependent features without stalling the user interface

## MODIFIED Requirements

### Requirement: Save to Seed
The system SHALL support saving/persisting a local word set back to its corresponding CSV seed file in the project's seeds directory, using the exact name of the word set as the filename, only when the local developer server is available.

#### Scenario: Successfully persisting a local dataset to its seed CSV file
- **WHEN** the local developer server is active, and the user clicks the "Save to Seed 💾" button inside a word set's detail view
- **THEN** the system SHALL compile the set's words into a standard RFC-4180 compliant CSV format, send it via a POST request to a custom API server middleware endpoint, write the CSV file locally to `src/data/seeds/<SetName>.csv`, and show a success notification

#### Scenario: Attempting to persist a local dataset when the server is unavailable
- **WHEN** the local developer server is inactive/absent
- **THEN** the system SHALL completely hide or disable the "Save to Seed 💾" button inside the word set's detail view to prevent invalid network requests and provide a clean, standalone user experience
