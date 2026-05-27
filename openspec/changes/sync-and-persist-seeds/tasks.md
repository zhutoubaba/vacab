## 1. Database & Sync Core Logic

- [x] 1.1 Implement the `syncSeedsToDatabase()` utility in `src/db.ts` to dynamically scan seed CSV files using the raw import glob.
- [x] 1.2 Add merging logic that matches existing words case-insensitively (`word.toLowerCase().trim()`), skips duplicates to preserve manual edits, and returns a detailed execution report (new words added count, skipped words count, skipped words list).
- [x] 1.3 Export the sync utility and ensure correct types are available.

## 2. Vite Server API Middleware

- [x] 2.1 Implement the `/api/save-seed` POST request handler in `vite.config.ts` inside Vite's `configureServer` hook for development mode.
- [x] 2.2 Implement the same `/api/save-seed` POST request handler in `vite.config.ts` inside Vite's `configurePreviewServer` hook to ensure full feature parity in production preview mode.
- [x] 2.3 Integrate Node `path.basename` sanitization to protect against directory traversal and write files as UTF-8 under `src/data/seeds/<SetName>.csv`.

## 3. UI Component Enhancements in SetsView.tsx

- [x] 3.1 Implement asynchronous IndexedDB CSV export fetching in the main `SetsView` component.
- [x] 3.2 Update `SetCardRow` component and pass down the `onExportSet` action, adding a lucide `Download` button right next to the delete button inside each dashboard set card.
- [x] 3.3 Add the global "Sync Seeds 🔄" button in the "My Word Sets" list header.
- [x] 3.4 Implement the sync completion report modal in `SetsView.tsx` that appears when a sync completes, displaying added counts, skipped counts, and a list of skipped words.
- [x] 3.5 Add the "Save to Seed 💾" button inside the set detail view (rendered side-by-side with the sync button).
- [x] 3.6 Implement the React handlers to compile the set's words into a RFC-4180 compliant CSV format and POST it to the local server endpoint, complete with error notifications if the server is unreachable.

## 4. Verification & Testing

- [x] 4.1 Verify seed syncing successfully imports new words, preserves manual edits by skipping existing words, and displays the report modal.
- [x] 4.2 Verify "Save to Seed" writes exact set names (e.g. `Primary Basics 101 🌱.csv`) to `src/data/seeds/` with unicode characters preserved.
- [x] 4.3 Verify fast-access dashboard CSV exports download correctly from the main sets list view.
