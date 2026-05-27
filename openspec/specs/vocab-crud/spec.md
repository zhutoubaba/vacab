# vocab-crud Specification

## Purpose
TBD - created by archiving change vocab-management-features. Update Purpose after archive.
## Requirements
### Requirement: Word Set Creation
The system SHALL allow users to create new word sets with a custom name.

#### Scenario: Successful creation of a word set
- **WHEN** the user inputs a name for a new word set and clicks "Create Set"
- **THEN** the system SHALL add the new word set to the local database and display it in the list of available sets

### Requirement: Word Set Deletion
The system SHALL allow users to delete a word set, which MUST automatically delete all words and logs associated with that set.

#### Scenario: Successful deletion of a word set
- **WHEN** the user selects a word set and clicks "Delete Set" and confirms the action
- **THEN** the system SHALL remove the word set, its words, and all related view and test logs from the database

### Requirement: Word Set Editing
The system SHALL allow users to edit the name of an existing word set.

#### Scenario: Successful rename of a word set
- **WHEN** the user inputs a new name for an existing word set and clicks "Save"
- **THEN** the system SHALL update the name in the database and reflect the change immediately in the user interface

### Requirement: Word Addition
The system SHALL allow users to add new words to a selected word set.

#### Scenario: Successful addition of a word
- **WHEN** the user inputs a new English word into a selected word set and clicks "Add Word"
- **THEN** the system SHALL add the word to the database, schedule an automatic background metadata fetch if fields are blank, and display it in the word set's list

### Requirement: Word Editing
The system SHALL allow users to manually edit a word's spelling, phonetic symbols, English definition, Japanese definition, and example sentences.

#### Scenario: Successful manual edit of a word
- **WHEN** the user edits the definition, phonetics, or sentences of an existing word and clicks "Save Word"
- **THEN** the system SHALL write the updated fields to the database and update all views displaying this word's details

### Requirement: Word Deletion
The system SHALL allow users to delete a word from a word set.

#### Scenario: Successful deletion of a word
- **WHEN** the user clicks "Delete" on a word and confirms
- **THEN** the system SHALL remove the word and its associated view/test logs from the database and update the dashboard and flashcard pools

