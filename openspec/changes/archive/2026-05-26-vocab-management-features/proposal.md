## Why

To transform the vocabulary web application into a complete, self-sustaining study tool, primary English learners need the ability to easily manage their word sets (adding, updating, deleting words), import/export their vocabulary lists via CSV for interoperability, and automatically enrich missing vocabulary metadata (English-Japanese definitions, phonetics, simple sentences) from internet dictionaries without manual entry. Additionally, supporting light and dark themes with excellent mobile UX is essential to accommodate different learning environments and improve user comfort.

## What Changes

- **Word Set Management**: Add full CRUD operations for multiple word sets and words inside them, including manual creation, editing, and deletion.
- **CSV Import/Export**: Add buttons to export word sets to standard CSV files and import words from user-uploaded CSV files.
- **Automated Metadata Enrichment**: Introduce a crawler/fetcher module that checks for missing definitions (English and Japanese), phonetic symbols, or example sentences, and queries public APIs (e.g., DictionaryAPI, MyMemory Translation API) to fill in these fields automatically for a single word or an entire word set.
- **Theme Toggle (Bright/Dark)**: Add a theme toggler that smoothly switches the app's color palette between a bright (warm cream/peach) mode and a premium dark mode, persisting the preference in localStorage.
- **Enhanced Mobile UI/UX**: Ensure all interactive elements, modals, drawers (like the YouGlish bottom sheet), and forms are highly responsive, accessible, and delight the user with polished micro-interactions and transitions.

## Capabilities

### New Capabilities
- `vocab-crud`: Allows users to fully manage word sets and individual words (add, view, edit, delete).
- `vocab-io`: Enables importing and exporting word sets as standard CSV files.
- `vocab-sync`: Automatically fetches definitions, phonetics, and beginner-friendly sentences for incomplete words or word sets.
- `ui-theme`: Provides a global, persisted theme switch between bright (light) and dark modes with fluid HSL-based styling.

### Modified Capabilities
<!-- None, this is a fresh project and these are the first specifications. -->

## Impact

- **Database Structure (IndexedDB)**: Schema needs to support word sets, words, and relational logs.
- **UI Components**: Global settings for theme toggling, new management views (crud forms, list management), CSV upload buttons, and status indicators for dictionary fetching.
- **External API Integrations**: Direct client-side calls to free dictionary APIs and translation APIs with error handling and fallback logic.
