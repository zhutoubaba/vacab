## 1. Setup & Environment Configuration

- [x] 1.1 Create the root-level git-ignored `.env` file containing local Turso credentials (URL and Read-Write Token)
- [x] 1.2 Update the [deploy.yml](file:///z:/node/vocab/.github/workflows/deploy.yml) workflow to inject `VITE_TURSO_URL` and `VITE_TURSO_TOKEN` secrets during compile-time

## 2. Seed Data Relocation & Configuration Cleanup

- [x] 2.1 Move `src/data/seeds` folder to the root-level `data/seeds` directory to isolate them from Vite compilation
- [x] 2.2 Remove `/api/save-seed` and `/api/health` middlewares and the file-writing node plugin from [vite.config.ts](file:///z:/node/vocab/vite.config.ts)

## 3. Database Layer Migration (Turso Integration)

- [x] 3.1 Rewrite `seedDatabase()` in [db.ts](file:///z:/node/vocab/src/db.ts) to query all seed sets and words from Turso HTTP pipeline endpoint and bulk insert them into IndexedDB
- [x] 3.2 Rewrite `syncSeedsToDatabase()` in [db.ts](file:///z:/node/vocab/src/db.ts) to pull seed data from Turso and merge new words into IndexedDB, while skipping duplicates case-insensitively and returning a summary report

## 4. Frontend UI Cleanup & Simplification

- [x] 4.1 Remove `SaveToSeed` button, its corresponding handler, and related state flags (`isSavingSeed`, `saveStatus`) from [SetsView.tsx](file:///z:/node/vocab/src/components/SetsView.tsx)
- [x] 4.2 Remove CSV drag-and-drop zone, file input change trigger, import status alerts, and related importing methods (`processCSVFile`, `handleDragOver`, etc.) from [SetsView.tsx](file:///z:/node/vocab/src/components/SetsView.tsx)
- [x] 4.3 Remove the "Dev Connected / Standalone Mode" status pill from [SetsView.tsx](file:///z:/node/vocab/src/components/SetsView.tsx)
- [x] 4.4 Remove unused `csvService.parseCSVFile` and references to `parseVocabularyCSV` from [csvService.ts](file:///z:/node/vocab/src/services/csvService.ts) and clean up any unused icons and imports in [SetsView.tsx](file:///z:/node/vocab/src/components/SetsView.tsx)

## 5. Verification & Build Testing

- [x] 5.1 Run local Vite server and verify successful seeding from the remote Turso instance when local database is empty
- [x] 5.2 Test "Sync Seeds" functionality on the dashboard and ensure sync reports display properly
- [x] 5.3 Compile a static production build with `npm run build` and ensure bundle output contains no seed files
