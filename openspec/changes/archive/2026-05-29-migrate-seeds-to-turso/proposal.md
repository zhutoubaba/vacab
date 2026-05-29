## Why

To optimize the build size and secure database access, we are migrating our static seed datasets out of the client-side bundle and into a remote Turso (libSQL) database. Since GitHub Pages only hosts static files with no backend server, loading seed data directly from Turso using a secure, read-only token is the most efficient and standard approach. 

Furthermore, removing the complex `SaveToSeed` endpoint and the CSV upload/import features simplifies the client-side user experience, reduces build-time dependency overhead, and optimizes the application strictly for remote seed synchronization and offline-first IndexedDB learning.

## What Changes

- **Turso libSQL Database Seeding**: Initialize database tables and seed all 417 words directly from the remote Turso libSQL instance during startup rather than using local eager raw CSV glob imports.
- **Root-Level Seed Relocation**: Move the seed CSV files from `src/data/seeds` to a root-level `data/seeds` directory to ensure Vite completely excludes them from bundle compilation.
- **Dual-Token Environment Model**: Enable a secure read-write token for local development and a read-only token injected in production via GitHub repository secrets and GitHub Actions.
- **Remove SaveToSeed Feature (BREAKING)**: Completely delete the "Save to Seed 💾" persistence buttons, state variables, and related server middleware APIs in `vite.config.ts`.
- **Remove CSV Upload & Import (BREAKING)**: Completely delete the file selector, drag-and-drop CSV dropzone, state handlers, and related import utility logic in `src/components/SetsView.tsx` and `src/services/csvService.ts`.

## Capabilities

### New Capabilities
*(None, we are modifying existing capabilities and simplifying requirements.)*

### Modified Capabilities
- `vocab-sync`: Transition seed database loading and sync operations to fetch from the remote libSQL Turso database HTTP endpoint using the provided environment credentials instead of reading local raw CSV modules.
- `vocab-io`: Remove all CSV import, parsing, and drag-and-drop uploading requirements. Remove `SaveToSeed` local backend middleware write capabilities. Retain only CSV download exporting from the dashboard.

## Impact

- `src/db.ts`: Remove eager raw glob imports, and refactor `seedDatabase()` and `syncSeedsToDatabase()` to pull from Turso via pipeline HTTP queries.
- `src/components/SetsView.tsx`: Clean up all import zones, status alert boxes, state management props, server availability checks, and save-to-seed triggers.
- `src/services/csvService.ts`: Remove the CSV parsing file reader utility method.
- `vite.config.ts`: Clean up all CSV file-writing middlewares and health endpoints.
- `.github/workflows/deploy.yml`: Inject `VITE_TURSO_URL` and `VITE_TURSO_TOKEN` secrets as environment variables during build time.
