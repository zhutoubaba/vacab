## ADDED Requirements

### Requirement: Save to Seed
The system SHALL support saving/persisting a local word set back to its corresponding CSV seed file in the project's seeds directory, using the exact name of the word set as the filename.

#### Scenario: Successfully persisting a local dataset to its seed CSV file
- **WHEN** the user clicks the "Save to Seed 💾" button inside a word set's detail view
- **THEN** the system SHALL compile the set's words into a standard RFC-4180 compliant CSV format and send it via a POST request to a custom API server middleware endpoint which writes the CSV file locally to `src/data/seeds/<SetName>.csv`.

## MODIFIED Requirements

### Requirement: CSV Export
The system SHALL allow users to export any word set as a standard comma-separated values (CSV) file. The CSV file MUST include columns for: Word, Phonetic, Definition_EN, Definition_JA, and Sentence_1, Sentence_2, Sentence_3.

#### Scenario: Successfully exporting a word set to CSV
- **WHEN** the user clicks the "Export" download icon button beside the delete button for a set on the sets list page
- **THEN** the system SHALL retrieve the set's words from IndexedDB, generate a CSV file containing all words with their phonetic symbols, definitions, and sentences, and trigger a browser file download named `<word_set_name>_vocab.csv`.
