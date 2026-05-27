# vocab-io Specification

## Purpose
TBD - created by archiving change vocab-management-features. Update Purpose after archive.
## Requirements
### Requirement: CSV Export
The system SHALL allow users to export any word set as a standard comma-separated values (CSV) file. The CSV file MUST include columns for: Word, Phonetic, Definition_EN, Definition_JA, and Sentence_1, Sentence_2, Sentence_3.

#### Scenario: Successfully exporting a word set to CSV
- **WHEN** the user selects a word set and clicks "Export to CSV"
- **THEN** the system SHALL generate a CSV file containing all words in the set with their phonetic symbols, definitions, and sentences, and trigger a browser file download named `<word_set_name>.csv`

### Requirement: CSV Import
The system SHALL allow users to import words into a selected word set by uploading a CSV file. The system SHALL parse the CSV and add new words. If the CSV contains columns for phonetics, definitions, or sentences, the system SHALL import them; if any of these fields are missing, the system SHALL save them as blank and schedule them for automatic online fetching.

#### Scenario: Successfully importing words from a CSV file
- **WHEN** the user selects a word set, uploads a valid CSV file containing a list of words, and clicks "Import CSV"
- **THEN** the system SHALL parse the CSV, insert the new words into the database for that set, ignore duplicates, and display the imported words in the UI

