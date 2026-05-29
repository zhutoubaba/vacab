## Context

VocabBloom currently initializes and synchronizes seed datasets locally by reading and parsing static CSV files eagerly globbed inside the browser IndexedDB database via Dexie. 

To host the application as a pure static web app on GitHub Pages with no backend server, we must:
1. Move the seed files out of the bundled client assets so they are not included in the production build.
2. Synchronize and pull the seeds dynamically from a remote Turso (libSQL) database using standard client-side HTTP operations.
3. Secure the database connection by serving a read-only token in production while retaining a read-write token for local development.
4. Simplify the application by removing code related to filesystem writing (`SaveToSeed`) and local CSV importing, as they are no longer required.

## Goals / Non-Goals

**Goals:**
- **Remote Cloud Seeding**: Populate the browser's IndexedDB from a remote Turso database when launched for the first time.
- **Efficient Network Seeding**: Fetch all seed word sets and their vocabulary rows in a single network request to minimize latency.
- **Exclusion of CSV Assets**: Move `src/data/seeds` to the root-level `data/seeds/` directory to prevent Vite from compiling them into the frontend build.
- **Secure Dual-Token Model**: Implement a secure environment architecture where the client uses a Read-Only token on GitHub Pages and a Read-Write token during local development.
- **Feature Simplification**: Completely remove the local file-writing middleware (`SaveToSeed` and `/api/save-seed`) and the drag-and-drop CSV importing feature to keep the codebase focused and thin.

**Non-Goals:**
- **No Private User Data Syncing**: We will not synchronize user-created word sets, learning progress, or test logs back to the Turso cloud database. User-created data remains fully private, stored strictly inside the local client browser IndexedDB instance.
- **No Complex ORM inside Client**: We will not install heavy ORMs or DB client wrappers in the client bundle. We will use standard browser native `fetch` requests with Turso's lightweight HTTP pipeline API.

## Decisions

### 1. Client-Side HTTP Pipeline Seeding over Native Client SDKs
- **Rationale**: Installing `@libsql/client` or similar database client drivers adds bundle weight and complexity to a client-side Vite project. Turso natively supports a highly efficient REST-based JSON HTTP pipeline endpoint (`/v2/pipeline`), which allows us to execute multiple SQL statements (e.g. fetching all sets AND all words) in a single round-trip `fetch` query.
- **Alternatives Considered**:
  - *`@libsql/client` SDK*: Rejected because it increases bundle size and introduces bundling warnings inside Vite.
  - *Sequential HTTP requests*: Rejected because making multiple fetch queries for every set introduces significant latency in slow network environments.

### 2. Dual-Token Architecture using Vite Env Prefixing
- **Rationale**: We define `VITE_TURSO_URL` and `VITE_TURSO_TOKEN` in a local, git-ignored `.env` file for local development using the read-write token. For production, we inject the read-only token through GitHub secrets at build time in the GitHub Actions compile step. This ensures that the exposed bundle token has no write privileges whatsoever.
- **Alternatives Considered**:
  - *Hardcoded read-write token*: Rejected immediately due to major security risks (total DB data deletion vulnerability).
  - *No token (Public DB)*: Rejected because Turso database access requires authentication for safety and usage rate-limiting.

### 3. Graceful Seeding Degradation
- **Rationale**: If the remote database is down, or if the user is offline on their first app launch (before seeding has finished), the app will display a subtle, helpful banner informing the user that seed data cannot be loaded at this time, rather than crashing.
- **Alternatives Considered**:
  - *Blocking error overlay*: Rejected because it degrades user experience; users should still be able to create custom word sets manually even if seeds fail to load.

## Risks / Trade-offs

- **[Risk] Production Token Exposure**
  - *Description*: Because the app is statically deployed, the `VITE_TURSO_TOKEN` is visible in the client code bundle.
  - *Mitigation*: We generate a strict **Read-Only token** for production. Any attempt to send modifying write requests using this token will be instantly rejected by the Turso database edge cluster.

- **[Risk] Offline Initial Launch**
  - *Description*: If a user launches the app for the very first time without an active internet connection, they will not have seeds loaded.
  - *Mitigation*: We display a warning notification in the UI. Seeding will run automatically on the next launch when an active network connection is detected.
