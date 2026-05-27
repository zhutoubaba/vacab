## Context

VocabBloom is a client-side Vite + React application that manages vocabulary datasets inside a browser IndexedDB database via Dexie. Seed datasets are currently loaded dynamically from standard CSV files (`src/data/seeds/*.csv`) using Vite's eager raw import globbing, but only on the very first launch. 

To improve dataset management, we need a mechanism to sync the project's permanent CSV seeds into IndexedDB without duplicating existing words (skipping them to protect custom user edits) and a way to persist local IndexedDB datasets back into the seed CSV files. Since standard browser JavaScript runs in a secure sandbox, we must bridge this gap locally using custom Vite server middlewares.

## Goals / Non-Goals

**Goals:**
- **Local Seed Syncing**: Implement a global dashboard button to parse all project seed files and import missing words while skipping duplicate words (case-insensitive, trimmed).
- **Post-Sync Report**: Present a detailed report modal showing which words were imported, which were preserved, and list their names.
- **Local CSV Persistence**: Expose a secure POST endpoint in both the Vite dev and preview servers to write CSV strings to `src/data/seeds/<SetName>.csv`.
- **Inner Set Detail Integration**: Add a "Save to Seed 💾" button in the set detail view that serializes the current set's words and triggers the local file-writing API.
- **Fast Dashboard CSV Export**: Move the standard "Export CSV" action from the detail view directly into each set card row on the dashboard list for quick-access downloads.

**Non-Goals:**
- **No Remote Backend**: We will not spin up or configure a separate production server (e.g., Express/Fastify). We will rely entirely on Vite's local Node.js process during dev and production preview.
- **No Cloud Synchronization**: Edits will remain purely local to IndexedDB and the local filesystem seeds.

## Decisions

### 1. Unified Dev & Preview Middleware via Vite Config
- **Rationale**: Since the browser cannot write files directly to the host filesystem, we expose a backend endpoint `/api/save-seed`. We register this middleware in both Vite's `configureServer` (for `npm run dev`) and `configurePreviewServer` (for `npm run preview` via `run-server.bat`) hooks. Both environments run on Node.js locally, meaning they will share the exact same filesystem capabilities and provide a seamless unified experience.
- **Alternatives Considered**:
  - *Separate Express server*: Rejected as it introduces port management, extra runtime configurations, and complex multi-process handling.
  - *Direct File Downloads only*: Rejected because it requires the user to manually find the downloaded file and drag-and-drop/overwrite files in their source tree.

### 2. Case-Insensitive, Trimmed Spelling Comparison for Syncing
- **Rationale**: When merging seed files, we will match existing words by checking if the lowercase, trimmed word spelling matches an IndexedDB entry in that set (`existingWord.word.toLowerCase().trim() === csvWord.word.toLowerCase().trim()`). If it matches, we skip it, which fully protects manual translation edits, custom phonetics, and quiz history.
- **Alternatives Considered**:
  - *Strict object equality (checking all properties)*: Rejected because if a user customized a definition in the app, the sync would treat it as a new word, causing duplicate word rows for the same vocabulary entry.

### 3. Background DB Fetching for Relocated CSV Export
- **Rationale**: The sets list view displays all sets using only their `WordSet` list headers. Moving the "Export CSV" action to the sets list card means we don't have the words pre-loaded in React state. To optimize performance, clicking the download icon will asynchronously fetch the words for that specific set ID directly from IndexedDB in the background, compile the CSV string, and trigger the browser download without loading all set words into memory beforehand.

## Risks / Trade-offs

- **[Risk] Hosted Server Deployment without Vite Backend**
  - *Description*: If the compiled static files are hosted on a static server (e.g., Netlify/GitHub Pages) where the local Vite server is not running, clicking "Save to Seed 💾" will fail.
  - *Mitigation*: The React UI will catch connection failures or non-200 responses from `/api/save-seed` and display an elegant alert banner: *"Failed to write to local seeds. Please ensure the local VocabBloom server is running."*
  
- **[Risk] Directory Traversal Vulnerability**
  - *Description*: If a user creates a set named `../../../dangerous_file` and clicks "Save to Seed", the API could overwrite system files.
  - *Mitigation*: The Vite server middleware will parse the filename using Node's `path.basename(setName)` to sanitize the name and ensure it can only write inside `src/data/seeds/`.
