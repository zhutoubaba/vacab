## Context

The application is a mobile-first web page designed for primary English learners. The goal is to provide a premium, offline-first learning tool. Since there is no heavy backend server, all data (word sets, words, view logs, test logs) must be managed on the client side using browser storage. We are building the application as a React SPA with Vite, leveraging IndexedDB for storage and public CORS-enabled APIs for dictionary fetching.

## Goals / Non-Goals

**Goals:**
- **Local-First Storage**: Store all word sets, words, and logs securely inside the browser using IndexedDB (Dexie.js) for high performance and offline capability.
- **Robust CSV Exchange**: Support importing and exporting word sets as standard RFC-4180 compliant CSV files entirely client-side.
- **Automated Meta-data Sync**: Query public CORS-enabled dictionary and translation APIs to automatically fetch phonetics, definitions, and sentences, bypassing any need for a custom proxy server.
- **Fluid Theme Swapping**: Implement a beautiful, smooth transitioning Light/Dark theme toggle using modern CSS variables with persisted storage.

**Non-Goals:**
- User accounts, server-side authentication, or cross-device cloud synchronization in this initial version.
- Integrating complex paid dictionary APIs that require keys or subscriptions.
- Advanced automated sentence generation using large language models.

## Decisions

### 1. Client-Side API Fetching (vocab-sync)
- **Decision**: Directly call `api.dictionaryapi.dev` (English definitions, phonetics, examples) and `api.mymemory.translated.net` (English-to-Japanese translations) from the client browser.
- **Rationale**: Both APIs are completely free, require no API keys, and have permissive CORS headers, allowing us to perform all queries without setting up a backend proxy server.
- **Alternatives Considered**: Creating a Node.js server. *Rejected* because it adds server maintenance costs, deployment complexity, and latency, which goes against a lightweight local-first web app model.

### 2. Browser-Based Database (IndexedDB with Dexie.js)
- **Decision**: Use `Dexie.js` to interact with IndexedDB for storing word sets, words, view logs, and test logs.
- **Rationale**: standard `localStorage` has a strict 5MB limit and only supports string data. IndexedDB is designed for complex relational querying, supports large datasets, and Dexie.js provides an elegant promise-based API with robust schema migrations.
- **Alternatives Considered**: Pure localStorage. *Rejected* because storing multiple word sets, logs, and long sentences would quickly hit the 5MB quota and make relational queries slow and brittle.

### 3. Theme Toggle via CSS Variables and LocalStorage
- **Decision**: Define colors in CSS using HSL format inside custom properties (CSS variables), toggle theme using a `.dark` class on the `<html>` element, and persist preferences in `localStorage`.
- **Rationale**: Using CSS variables is highly performant and allows fluid visual transitions using simple `transition: all 0.3s ease` in CSS. Reading the preference from `localStorage` in an inline script block in `index.html` prevents the "flicker of light theme" on page load.
- **Alternatives Considered**: CSS-in-JS themes. *Rejected* because it increases bundlesize and has slightly worse performance during transitions compared to native CSS variables.

## Risks / Trade-offs

- **[Risk] API Rate Limits**: Public translation and dictionary APIs might rate-limit the client if the user initiates a bulk sync of hundreds of words at once.
  - *Mitigation*: We will implement a **throttled batch fetch queue** that processes sync requests sequentially (one word at a time) with a 500ms delay between calls, and display a progress bar so the user is kept informed.
- **[Risk] CORS Policy Changes**: If MyMemory or DictionaryAPI suddenly change their CORS headers or shut down, client-side syncing will break.
  - *Mitigation*: The system is designed to degrade gracefully. If fetching fails, the word is added as a blank entry, and the user is instantly shown an "Edit Word" modal to input the definitions manually.
- **[Risk] CSV Parsing Errors**: CSV files uploaded by users might have malformed structures (missing quotes, wrong columns).
  - *Mitigation*: We will write a robust client-side CSV parser that detects and validates column headers (Word, Translation, etc.), ignores malformed rows, and alerts the user of any errors instead of crashing the app.
