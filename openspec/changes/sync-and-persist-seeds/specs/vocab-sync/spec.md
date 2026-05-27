## ADDED Requirements

### Requirement: Sync Seed Database
The system SHALL support syncing the permanent CSV seed datasets from the project's seeds directory into the local IndexedDB database, merging new words, preserving manual edits by skipping duplicate words (case-insensitive, trimmed), and displaying a post-sync summary report.

#### Scenario: Successfully syncing CSV seeds into IndexedDB
- **WHEN** the user clicks the global "Sync Seeds 🔄" button on the sets dashboard
- **THEN** the system SHALL parse all seed CSV files, import missing words, skip duplicate words, and display a report modal highlighting the number of successfully imported words, the number of preserved words, and listing the specific words that were preserved.
