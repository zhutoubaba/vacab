## ADDED Requirements

### Requirement: Sync Seed Database
The system SHALL support syncing the seed datasets from the remote Turso libSQL database into the local IndexedDB database, merging new words, preserving manual edits by skipping duplicate words (case-insensitive, trimmed), and displaying a post-sync summary report.

#### Scenario: Successfully syncing Turso seeds into IndexedDB
- **WHEN** the user clicks the global "Sync Seeds 🔄" button on the sets dashboard
- **THEN** the system SHALL fetch all word sets and words from the remote Turso libSQL database, import missing words, skip duplicate words, and display a report modal highlighting the number of successfully imported words, the number of preserved words, and listing the specific words that were preserved.
