## 1. Backend Health Check API

- [x] 1.1 Register GET `/api/health` endpoint in `configureServer` middleware in `vite.config.ts` to respond with `200 OK` and `{ success: true }`.
- [x] 1.2 Register GET `/api/health` endpoint in `configurePreviewServer` middleware in `vite.config.ts` to respond with `200 OK` and `{ success: true }`.

## 2. Client-Side Non-blocking Probe

- [x] 2.1 Implement server checking logic in `src/components/SetsView.tsx` (or `src/App.tsx`) using a fast `fetch` call with an `AbortController` timeout of 600ms.
- [x] 2.2 Define an active state `isServerActive` that safely handles failed/timed-out requests and defaults to `false`.

## 3. UI Conditional Display & Connection Badge

- [x] 3.1 Update the render layout in `src/components/SetsView.tsx` to conditionally display the "Save to Seed 💾" button only if `isServerActive` is `true`.
- [x] 3.2 Add a sleek, premium status badge next to the vocabulary sets header (e.g. `● Dev Connected` in pulsing green when active, `● Standalone Client` in static gray when inactive) to ensure high-fidelity developer UX.

## 4. Verification & Testing

- [x] 4.1 Verify that the client loads instantaneously and displays "Standalone Client" with the save button hidden when the backend server is simulated as down.
- [x] 4.2 Verify that the client displays "Dev Connected" with the save button visible when running in the full local Node/Vite development server environment.
