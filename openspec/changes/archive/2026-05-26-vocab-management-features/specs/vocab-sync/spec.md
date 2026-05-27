## ADDED Requirements

### Requirement: Single Word Metadata Fetching
The system SHALL support automatically querying online dictionaries and translation APIs to populate missing phonetic symbols, English definitions, Japanese definitions, and beginner-friendly example sentences for a specific word.

#### Scenario: Automatically fetching metadata for a single word
- **WHEN** the user adds a new word or triggers a manual sync for an existing word that has missing details
- **THEN** the system SHALL fetch phonetics and definitions from standard public APIs, translate the definition to Japanese, select short example sentences, and save them to the database, updating the UI immediately

### Requirement: Word Set Metadata Syncing
The system SHALL support bulk syncing for all words in a word set that have incomplete or missing phonetic symbols, definitions, or sentences.

#### Scenario: Successfully syncing a whole word set
- **WHEN** the user clicks "Sync Set" on a selected word set
- **THEN** the system SHALL scan the set for any words with missing metadata, sequentially query the online services for each incomplete word while showing a progress bar, and update the database and UI as each word completes

### Requirement: Graceful Fetch Failure
The system SHALL handle cases where a word is not found or the internet connection is offline by preserving the word and alerting the user, leaving the details empty for manual input.

#### Scenario: Word not found in online dictionary
- **WHEN** the system attempts to fetch metadata for a misspelled or unrecognized word
- **THEN** the system SHALL stop the fetch operation for that word, mark it as "unresolved", keep existing database values, and display a subtle indicator prompting the user to edit the word manually
