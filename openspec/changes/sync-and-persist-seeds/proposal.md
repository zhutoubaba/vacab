## Why

Currently, seed datasets are only loaded on a fresh application launch when the IndexedDB database is completely empty. If new seed files are added to the codebase or seed words are updated, there is no way for a user to sync them without wiping their entire local database and losing all custom word sets, learning progress, and quiz history. 

Furthermore, there is no direct mechanism to persist custom datasets or manual edits back into the project's permanent CSV seed files (`src/data/seeds/`), and exporting a CSV requires navigating inside the set's details first. Relocating the export tool and adding a local dev/preview-backed seed writer solves these limitations.

## What Changes

- **Sync Seed Database 🔄**: Added a global "Sync Seeds 🔄" button in the main sets list view. It scans the seed CSV files and merges missing words into the local database, leaving user-created sets and words completely intact.
- **Smart Duplicate Prevention & Sync Report**: During seed syncing, if a word already exists locally, it is skipped to protect any manual user edits/translations. Upon completion, a polished sync report modal highlights exactly which words were skipped and how many were successfully added.
- **Save to Seed 💾**: Added a "Save to Seed 💾" button in the word set detail view. When clicked, it builds an RFC-4180 compliant CSV string and writes it back to `src/data/seeds/<SetName>.csv`.
- **Dual-Server CSV API Middleware**: Added file-writing API endpoints to both the Vite dev server (`configureServer`) and the Vite production preview server (`configurePreviewServer`) to write seed CSV files locally.
- **Fast Dashboard CSV Export**: Relocated the "Export CSV" action from the set details page to the main dashboard, placing a fast-access download button beside the delete button inside each set card.

## Capabilities

### New Capabilities
*(None, we are extending the requirements of existing features.)*

### Modified Capabilities
- `vocab-sync`: Added syncing seed database CSVs into IndexedDB with merge reporting, while keeping manual edits and local-only sets intact.
- `vocab-io`: Relocated the "Export CSV" action to the main dashboard list view and added "Save to Seed 💾" filesystem persistence using a Vite dev/preview server middleware endpoint.

## Impact

- `src/db.ts`: Add `syncSeedsToDatabase()` logic.
- `vite.config.ts`: Register dev and preview middleware for `POST /api/save-seed` endpoint.
- `src/components/SetsView.tsx`: Integrate the new UI buttons, the sync completion report modal, and hook up the relocated CSV exporter.
