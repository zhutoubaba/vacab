## Why

Currently, VocabBloom includes a "Save to Seed 💾" feature (`/api/save-seed`) that relies on a custom Vite dev/preview server middleware to persist vocabulary sets back to the project's static seeds directory. When the application is deployed in a purely static/standalone environment (e.g., GitHub Pages, Vercel, Netlify) or when the local dev server is not running, loading the home page works fine, but trying to use the server-dependent saving function results in network errors or a broken user experience. We need a resilient, non-blocking check to automatically detect server-side availability on client startup, gracefully disabling and hiding server-only features in static standalone environments while keeping the home page responsive and offline-resilient.

## What Changes

- **Non-blocking Server Probing**: Implement a lightweight, non-blocking check (GET request to a health endpoint `/api/health` with a 600ms AbortController timeout) on client initialization to probe if the local Node/Vite backend server is running.
- **Graceful UI Adaptation**: If the server-side service is unavailable, dynamically hide or disable the "Save to Seed 💾" button on the vocabulary set detail page in the Sets view.
- **Connection Status Badge**: Add a subtle, premium-designed status badge in the UI (e.g., green dot "Dev Connected" when the server is active, and gray dot "Standalone" or completely hidden when inactive) to convey the client's operation mode clearly and elegantly.

## Capabilities

### New Capabilities
*(None. We are modifying existing capability behavior.)*

### Modified Capabilities
- `vocab-io`: The "Save to Seed" local filesystem persistence requirement becomes conditional, dynamically disabling or hiding itself when the local backend server is absent.

## Impact

- `vite.config.ts`: Register a lightweight GET `/api/health` endpoint in both `configureServer` and `configurePreviewServer` middlewares.
- `src/components/SetsView.tsx`: Integrate the non-blocking status probing check on mount, track the server's availability, and conditionally render the "Save to Seed 💾" button.
