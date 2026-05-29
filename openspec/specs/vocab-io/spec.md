# vocab-io Specification

## Purpose
TBD - created by archiving change vocab-management-features. Update Purpose after archive.
## Requirements
### Requirement: CSV Export
The system SHALL allow users to export any word set as a standard comma-separated values (CSV) file. The CSV file MUST include columns for: Word, Phonetic, Definition_EN, Definition_JA, and Sentence_1, Sentence_2, Sentence_3.

#### Scenario: Successfully exporting a word set to CSV
- **WHEN** the user selects a word set and clicks "Export to CSV"
- **THEN** the system SHALL generate a CSV file containing all words in the set with their phonetic symbols, definitions, and sentences, and trigger a browser file download named `<word_set_name>.csv`

