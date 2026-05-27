## 1. Project Initialization & Styling System

- [x] 1.1 Set up React SPA with Vite and TypeScript inside the workspace
- [x] 1.2 Define Bright and Dark HSL color palettes in index.css with smooth CSS variables transitions
- [x] 1.3 Implement persistent global ThemeToggle component and integrate into the app header
- [x] 1.4 Design and build the mobile-responsive frame and bottom navigation bar

## 2. Local-First Database Configuration (IndexedDB)

- [x] 2.1 Set up Dexie.js to declare schemas for `wordSets`, `words`, `viewLogs`, and `testLogs`
- [x] 2.2 Write a database seeder script to populate a beautiful "Primary Basics" starter word set with definitions, phonetics, and sample sentences
- [x] 2.3 Create database helper hooks for active word set selections and statistics queries

## 3. Vocabulary CRUD Features (vocab-crud)

- [x] 3.1 Build the Word Set Management view with visual cards representing sets
- [x] 3.2 Implement modals for "Create Set", "Rename Set", and "Delete Set" (with recursive cascading deletions)
- [x] 3.3 Create the Word List view inside a selected set showing all contained words
- [x] 3.4 Implement modals/forms for "Add Word" and "Edit Word" (enabling complete manual edits of phonetics, definitions, and sentences)
- [x] 3.5 Implement word deletion with UI list updates and database cleanup

## 4. CSV Import & Export Capabilities (vocab-io)

- [x] 4.1 Create client-side export utility to compile a word set's details into standard RFC-4180 CSV files and trigger automatic browser download
- [x] 4.2 Create a file upload drag-and-drop area for CSV files in the Word Set view
- [x] 4.3 Implement standard CSV parser with column validation (handling word, phonetics, translations, sentences) and duplicate word prevention
- [x] 4.4 Trigger background online sync for any imported words containing blank phonetic or definition fields

## 5. Automated Online Metadata Sync (vocab-sync)

- [x] 5.1 Implement a dictionary fetching service that queries `api.dictionaryapi.dev` for phonetics, English definitions, and simple examples
- [x] 5.2 Implement translation service that queries MyMemory translation API for English-to-Japanese translations
- [x] 5.3 Implement a throttled bulk sync scheduler (sequential execution with 500ms delay) to fetch missing data for an entire word set
- [x] 5.4 Build a bulk sync progress bar with a cancellation option in the UI
- [x] 5.5 Integrate automated single-word fetch when adding a word, with graceful error fallbacks for misspelled words or offline state

## 6. Flashcard Interface & YouGlish Bottom Sheet

- [x] 6.1 Build the interactive 3D Flashcard player with card flip animations and touch gesture support
- [x] 6.2 Implement flashcard sorting mechanisms: Alphabetical order (A-Z), Error Rate order, and Shuffle (random)
- [x] 6.3 Implement a view-tracking event that logs a new record in `viewLogs` whenever a card is flipped/revealed
- [x] 6.4 Implement a beautiful, slide-up YouGlish bottom sheet drawer utilizing YouGlish's JavaScript widget SDK
- [x] 6.5 Bind `widget.fetch(word, 'english')` programmatically inside the bottom sheet upon opening, and handle loading/errors

## 7. Multiple Choice Quiz Engine

- [x] 7.1 Build the 4-choice Japanese translation quiz screen supporting Alphabetical, Random, and Error Rate sorting
- [x] 7.2 Implement the Distractor Option Generator that pulls incorrect Japanese definitions from the same set, other sets, or fallback words
- [x] 7.3 Create visual selection feedback (soft green for correct, soft red for incorrect) with a Next Card trigger
- [x] 7.4 Implement a log-logging event that writes to `testLogs` (recording word ID, is_correct, selected option, timestamp) on each answer
- [x] 7.5 Design a celebratory score summary screen with congratulations animations when a quiz session completes

## 8. Dashboard Analytics & Sorting

- [x] 8.1 Build the Learning Status Dashboard table showing columns: Word, Views, Tests, Errors, Error Rate, and Days Active
- [x] 8.2 Add ascending/descending sorting indicators to all table column headers and implement reactive sort selectors
- [x] 8.3 Implement learning mastery badges (🌱 Seedling for untested/high error, 🌿 Sprout for moderate, 🌳 Tree for mastered)
- [x] 8.4 Conduct mobile responsive testing on multiple viewport sizes, verifying layout integrity and touch targets
