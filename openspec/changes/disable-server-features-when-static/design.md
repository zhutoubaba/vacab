## Context

The VocabBloom application uses a client-side IndexedDB database (via Dexie) for its core vocabulary CRUD, dashboard, quizzes, and flashcard functionality. It is naturally offline-first and runs beautifully as a static web app. However, the developer utility "Save to Seed 💾" writes edited vocabulary lists back to the project's physical `src/data/seeds` folder via a custom Node/Vite middleware `/api/save-seed`. 

When deployed on a purely static host (e.g., GitHub Pages, Vercel, Netlify) or when running the dev bundle without starting the local server, this local filesystem writer is unavailable. Trying to execute this endpoint leads to a failed network call. There is currently no dynamic check in place to identify backend availability on launch, leading to dead interactive components.

## Goals / Non-Goals

**Goals:**
- Provide a completely non-blocking, non-stalling startup routine that probes local developer backend server availability on app launch.
- Dynamically enable/disable and show/hide the "Save to Seed 💾" button in the Sets view depending on server status.
- Add a premium, polished connection status badge in the header/Sets view to clearly denote "Developer (Connected)" mode vs. "Standalone (Static)" mode.
- Guarantee that page loads remain instantaneous and responsive under all backend states.

**Non-Goals:**
- Monitoring browser-level online connectivity (`navigator.onLine`).
- Restricting or modifying public web services (DictionaryAPI, MyMemory, YouGlish).
- Replacing standard browser-native CSV imports/exports, which remain fully operational.

## Decisions

### Decision 1: Create a GET `/api/health` Endpoint in Vite Middleware
We will introduce a lightweight GET endpoint `/api/health` in `saveCsvMiddleware` inside `vite.config.ts`. It immediately responds with 200 OK and `{ success: true }`.
- *Rationale*: A dedicated GET endpoint provides a clean, standard path to probe backend health.
- *Alternative Considered*: Doing a GET or HEAD request directly on `/api/save-seed`. However, `/api/save-seed` is designed for CSV payload writing via POST, so a separate lightweight health-check path is much cleaner.

### Decision 2: 600ms AbortController Timeout Probe
In the client, the backend server health check is made at startup. It will employ `AbortController` to force a strict timeout threshold of 600 milliseconds. If the request fails, returns non-OK, or times out, it is silently caught and the server status is flagged as unavailable.
- *Rationale*: Because the server is hosted locally (`localhost`), responses are normally sub-10ms. If it does not respond within 600ms, the server is down or blocked. This strict timeout ensures the page load never stalls.
- *Alternative Considered*: Fetching without a timeout. This is risky because standard browser fetch timeouts can be up to 30-90 seconds, causing persistent "loading" spinners or making the app feel frozen under bad port bindings.

### Decision 3: Aesthetic Connection Status Badge
Introduce a subtle, elegant connection status indicator near the "My Word Sets" header:
- **Server Available**: `● Dev Server Connected` with a pulsing light-green indicator.
- **Server Down / Static**: `● Standalone Client` with a muted gray indicator.
- *Rationale*: Gives developer users instant feedback on whether changes can be saved back to source seeds, while maintaining the app's clean, premium, and professional look.

## Risks / Trade-offs

- **[Risk]**: The initial health check fetch could generate console errors (e.g. `GET http://localhost:4173/api/health net::ERR_CONNECTION_REFUSED`) when running in static/standalone mode.
  - **Mitigation**: This is standard browser behavior for failed fetches and cannot be fully silenced, but since the error is gracefully caught, it is harmless and does not affect runtime JS execution. We will document this expected behavior.
