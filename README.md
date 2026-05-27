# 🌸 VocabBloom — Mobile-First Primary English Learning Assistant (VocabBloom Workspace Manual)

🌐 **Language**: **English** | [简体中文](README.zh-CN.md)

> A visually stunning, offline-first, fully-featured vocabulary learning web application tailored specifically for **primary English learners** (especially mobile users). Adhering to a Single Page Application (SPA) architecture, the project utilizes modern pure front-end offline technologies paired with physical cascade writes to the local filesystem, delivering an exceptionally smooth vocabulary-building experience.

---

## 🎯 Project Purpose & Pedagogical Background

For students or children in the primary stage of English learning, traditional vocabulary applications often present several obstacles:
- **Obscure and Lengthy Examples**: Overflowing with post-graduate or academic-level vocabulary, which leads to severe frustration.
- **Overly Complex English Definitions**: Explaining a simple word using even more difficult words, defeating the purpose.
- **Frequent App Hopping**: Switching to third-party dictionaries for pronunciation search makes it extremely easy to get distracted by social media or ads.
- **Unusable in Weak/No Network Environments**: Unable to function in subways, airplanes, or outdoor offline environments.

**VocabBloom** is designed and built upon the following four core principles:
* **Mobile-First Layout**: The entire application's layout and elements are locked within the golden mobile viewport width of `480px`. Designed around the thumb-zone theory, it features smooth large cards, rounded glassmorphism micro-interactions, and high-tactile one-handed controls.
* **Offline-First / Local-First**: Centered on client-side local storage to eliminate expensive cloud API latency. It achieves sub-second loading and guarantees no data loss even under offline or weak network conditions.
* **Primary Learner Friendly**: The length of vocabulary example sentences is strictly constrained to **between 3 and 12 words**. The application automatically filters the most core, high-frequency single definition, minimizing cognitive load for beginners.
* **Immersive Contextual Pronunciation**: Features an innovative, embedded half-screen YouGlish drawer. Users can hear real-world YouTube video clips of native English speakers showing mouth shapes and authentic pronunciations without leaving the page, providing highly immersive contextual learning.

---

## 💾 Database Architecture & Dexie (IndexedDB) Design

VocabBloom leverages a highly optimized integration of `Dexie.js`, a sub-millisecond wrapper around HTML5's transactional `IndexedDB`. The entire data flow and storage utilize a structured multi-table joint query design, ensuring fluid performance even with tens of thousands of words stored locally.

### 1. Database Schema Topology

```
  ┌────────────────────────────────────────────────────────┐
  │                      VocabDatabase                     │
  └───────────────────────────┬────────────────────────────┘
                               │
     ┌────────────────────────┼────────────────────────┐
     ▼                        ▼                        ▼
┌──────────────┐         ┌──────────┐            ┌──────────┐
│   wordSets   │         │  words   │            │ viewLogs │
├──────────────┤         ├──────────┤            ├──────────┤
│ ++id         │ ◄───┐   │ ++id     │ ◄────┐     │ ++id     │
│ name         │     └───│ set_id   │      ├──── │ word_id  │
│ created_at   │         │ word     │      │     │ viewed_at│
└──────────────┘         │ phonetic │      │     └──────────┘
                         │ def_en   │      │
                         │ def_ja   │      │     ┌──────────┐
                         │ sentences│      │     │ testLogs │
                         │created_at│      │     ├──────────┤
                         └──────────┘      │     │ ++id     │
                                           └──── │ word_id  │
                                                 │is_correct│
                                                 │selected  │
                                                 │tested_at │
                                                 └──────────┘
```

### 2. Fields & Secondary Index Definitions

In [src/db.ts](file:///z:/node/vacab/src/db.ts), secondary hash indexes are explicitly created for key relationship fields via `this.version(1).stores()` to ensure sorting and table-joining queries complete within milliseconds:

```typescript
this.version(1).stores({
  wordSets: '++id, name, created_at',
  words: '++id, set_id, word, created_at',
  viewLogs: '++id, word_id, viewed_at',
  testLogs: '++id, word_id, is_correct, tested_at'
});
```

* **`wordSets` Table**:
  * `id`: Auto-incrementing primary key (`number`).
  * `name`: Unique set name (`string`), indexed to enable fast lookup and deduplication during sync.
  * `created_at`: Creation timestamp (`Date`).
* **`words` Table**:
  * `id`: Auto-incrementing primary key (`number`).
  * `set_id`: Foreign key referencing the parent word set (`number`), **indexed**. Enables millisecond-level word list rendering using `db.words.where('set_id').equals(setId)`.
  * `word`: Spelling string (`string`), indexed for fast lookup and duplicate prevention.
  * `phonetic`: International Phonetic Alphabet (IPA) symbol (`string`).
  * `definition_en`: Simplified English-English definition (`string`).
  * `definition_ja`: Japanese translation/definition (`string`).
  * `sentences`: Array of minimal example sentences (`string[]`).
  * `created_at`: Storage timestamp (`Date`).
* **`viewLogs` Table**:
  * `word_id`: Foreign key referencing a word (`number`), indexed. Increments the view count when cards are flipped.
* **`testLogs` Table**:
  * `word_id`: Foreign key referencing a word (`number`), indexed. Used for dynamic error rate aggregation and "Hardest First" prioritization.
  * `is_correct`: Correctness status of the quiz answer (`boolean`).
  * `selected_option`: The distractor option selected by the user (`string`).

### 3. Transactional Cascade Deletes
Since `IndexedDB` does not natively support SQL-like `ON DELETE CASCADE` constraints, VocabBloom manually implements **transactional cascade deletes** within `SetsView.tsx`. When deleting a word set, a read-write transaction executes atomically to wipe out all descendant words and their associated extensive viewing/testing logs, preventing database fragmentation:

```typescript
await db.transaction('rw', [db.wordSets, db.words, db.viewLogs, db.testLogs], async () => {
  const wordsInSet = await db.words.where('set_id').equals(setId).toArray();
  const wordIds = wordsInSet.map(w => w.id!).filter(id => id !== undefined);

  if (wordIds.length > 0) {
    // Purge viewing and quiz logs for all matching words to prevent orphan data records
    await db.viewLogs.where('word_id').anyOf(wordIds).delete();
    await db.testLogs.where('word_id').anyOf(wordIds).delete();
    await db.words.where('set_id').equals(setId).delete();
  }
  // Safely remove the main word set header
  await db.wordSets.delete(setId);
});
```

---

## ✨ Core Components & Services Architecture

VocabBloom's core views and data services leverage a highly cohesive, loosely coupled modular design. Business logic is decoupled from UI components via custom Hooks and specialized service singletons, ensuring smooth state transitions:

### 1. 🗂️ Word Sets Dashboard & Sync / Persist Flow (`SetsView.tsx`)

The `SetsView` component acts as the central hub connecting the local database with the workspace's CSV seed files.

#### A. Permanent Seed Database Synchronization Algorithm (Sync Seeds)
To seamlessly synchronize new CSV seed databases without wiping existing IndexedDB data, we built the `syncSeedsToDatabase()` algorithm in [src/db.ts](file:///z:/node/vacab/src/db.ts):

```
                       syncSeedsToDatabase()
                                 │
                   Read src/data/seeds/*.csv 
                                 │
                 Does WordSet with same name exist?
                                 ├── [No]  ──> Create new WordSet
                                 └── [Yes] ──> Get setId
                                               │
                                 Get all local words under this set
                                 Create lowercase() deduplication Map index
                                               │
                              Iterate over each word row in seed CSV:
                                               │
                             Does word spelling exist in IndexedDB Map?
                                 ├── [Yes] ──> Skip, record in skippedWords (protect manual edits)
                                 └── [No]  ──> Parse phonetic & sentences, append to wordsToAdd
                                               │
                                       db.words.bulkAdd()
                                               │
                                  Return SyncReport completion report
```
At the end of the synchronization, a highly interactive **Sync Report Modal** pops up. This modal not only visualizes the "Added" and "Skipped" counts, but also uses a glassmorphism Tag Cloud to elegantly display all words that were skipped to protect users' manual modifications, providing complete transparency and reassurance.

#### B. CSV Export & Drag-and-Drop Import (Import / Export)
- **Quick Export 📥**: Handled by [csvService.ts](file:///z:/node/vacab/src/services/csvService.ts). Clicking the download icon triggers an asynchronous Promise that reads all words with the matching `set_id` from IndexedDB, escapes double quotes using `escapeCsv`, prepends a UTF-8 BOM, and automatically initiates a local file download, making it fully compatible with Microsoft Excel.
- **Drag-and-Drop Import 📤**: A beautiful drop zone at the bottom of the details page supports a character-stream CSV parser that accurately handles double quotes and commas within example sentences to prevent parsing misalignment. Once imported, it scans for incomplete fields and activates the online autocomplete service after a 1.5-second delay.

---

### 2. 🎴 3D Smart Flashcards (`LearnView.tsx`)

`LearnView` implements multi-modal word memorization, text-to-speech pronunciation, and YouGlish native pronunciation video embedding.

#### A. Underlying Vocabulary Sorting Logic
Leverages `sortVocabulary()` in [arrayUtils.ts](file:///z:/node/vacab/src/utils/arrayUtils.ts) to drive adaptive multi-modal vocabulary lists:
- **Random**: Applies the classic **Fisher-Yates (Knuth) shuffle algorithm** for in-place array shuffling.
- **Alphabetical**: Employs `localeCompare()` to sort words alphabetically.
- **Hardest First**: Queries `testLogs` and computes the error rate as `(errors / tests) * 100`. Words that have never been tested are **assigned a maximum error rate of 100%** by default. This guarantees an intelligent, adaptive learning loop where new, difficult, and frequently missed words are presented first.

#### B. Slow American English Audio Pronunciation (Text-to-Speech)
Audio speech is delegated to [speechService.ts](file:///z:/node/vacab/src/services/speechService.ts), which utilizes the native **Web Speech Synthesis API** optimized for primary learners:
- **Slow-Rate Lock (`rate = 0.85`)**: Forces speech rate to `0.85` to ensure phonemes are pronounced clearly and fully, making them easier to mimic.
- **US-English Lock (`lang = 'en-US'`)**: Detects and locks pronunciation to an American English voice from the system synthesizer library to maintain standard accents.
- **Overlap Prevention (Auto-Cancel)**: Explicitly invokes `window.speechSynthesis.cancel()` before firing a new voice clip to stop ongoing tracks from overlapping.

#### C. Mounting & Lifecycle Management of the YouGlish Bottom Sheet Drawer
To allow users to hear authentic native pronunciations from YouTube in context without leaving the app, we created an embedded half-screen YouGlish drawer:
* **Dynamic SDK Injection**: When the user flips a card to the back for the first time, the application appends `<script src="https://youglish.com/public/js/5/widget.js">` to the page and listens for `onYouglishAPIReady` on the global `window` object.
* **DOM Reuse & Playback Supervision**: When the drawer opens, it targets the `#yg-widget` placeholder to initialize the `YG.Widget` instance. Whenever the user slides to another card or closes the drawer, the code explicitly releases the widget resources and halts active speech synthesized tracks to prevent memory leaks and background audio leakage.

---

### 3. 📝 Dual-Mode Intelligent Quiz Engine (`TestView.tsx` & `useQuiz.ts`)

To offer primary learners a complete feedback loop going from recognition (multiple-choice) to active production (spelling), the quiz module is designed around a decoupled React state structure driven uniformly by the custom `useQuiz.ts` Hook.

#### A. Multiple-Choice Mode & Three-Tier Distractor Generation
The quality of multiple-choice distractors is essential for effective learning. To avoid irrelevant or nonsensical options, the system uses a **three-tier fallback distractor extraction algorithm**:

```
                           [Start Generating 4-Option Quiz]
                                          │
                              Retrieve Correct Definition:
                                activeWord.definition_ja
                                          │
                          【Tier 1: Same Set Words】
                    Randomly select words from the same set_id.
                     Exclude correct answer; build unique array.
                                          │
                              Are 3 distractors collected?
                                  ├── [Yes] ──> [Step 4: Combine & Shuffle]
                                  └── [No]  ──> Proceed to Tier 2
                                                │
                          【Tier 2: Other Sets Words】
                   Fetch words from all other set_ids in local DB.
                    Exclude correct answer & existing choices; pad.
                                                │
                              Are 3 distractors collected?
                                  ├── [Yes] ──> [Step 4: Combine & Shuffle]
                                  └── [No]  ──> Proceed to Tier 3
                                                │
                          【Tier 3: Hardcoded Fallback Bank】
                   Select from built-in primary-level definitions
                     (FALLBACK_DISTRACTORS). Exclude correct one; pad.
                                                │
                                                ▼
                          【Step 4: Combine & Shuffle】
                   Merge distractors with the correct option.
                    Apply Fisher-Yates shuffle to scramble choices.
```

- **High-Sensitivity Haptic Feedback**: When a user selects an incorrect option, the system triggers the standard `navigator.vibrate(100)` API to deliver a `100` millisecond micro-vibration on mobile devices, reinforcing physical feedback during errors.

#### B. Spelling Mode & Mobile Virtual Keyboard Avoidance
Spelling tests are custom-tailored for mobile users, solving a classic mobile web pain point: virtual keyboards shrinking the viewport and pushing interactive elements (questions, input boxes, actions) out of view.

* **Adaptive Viewport Re-layout (Keyboard-Active Tracking)**:
  A global event listener on `focusin`/`focusout` in [App.tsx](file:///z:/node/vacab/src/App.tsx) dynamically tracks input focus. When the spelling input box is focused, a `.keyboard-active` class is injected into the `<body>` element, **automatically hiding the sticky bottom navigation bar (`bottom-nav`)**. This releases an extra `60px` of vertical space, completely preventing keyboard clipping.
* **Sleek Interactive Slots Grid**:
  High-contrast glassmorphism character slot cards are programmatically generated matching the length of the target word. Each slot responds dynamically:
  - **Active Slot Pulse (`spelling-cursor`)**: The slot representing the active input character shows a pulsing glowing border, assisting in blind-typing.
  - **Semi-Transparent Placeholder**: Prompts "Tap boxes to type spelling" when blurred; tapping any slot immediately invokes the virtual keyboard.
* **Jitter-Free Transparent Overlay Input**:
  A real HTML `<input>` is positioned with `opacity: 0` and `z-index: 10` directly over the mock slot grid. This invokes native keyboard focus but ensures the browser viewport won't jitter, shift, or auto-zoom as the input gains focus.
* **Auto-Submit on Match**:
  The `handleSpellingChange` handler filters valid alphabetical characters. When the character length matches the target word, it **instantly triggers verification without delay**, eliminating the need for a tedious "Submit" button click on mobile.

---

### 4. 📊 Learning Analytics Dashboard & Tree Badges (`DashboardView.tsx`)

The stats view compiles aggregate progress and lists sorted word metrics, offloaded to the dedicated [statsService.ts](file:///z:/node/vacab/src/services/statsService.ts) for bulk computations.
* **O(1) Single-Batch Parallel Aggregation**: Loads all `viewLogs` and `testLogs` in one bulk database read and constructs in-memory Hash Maps for computation. This collapses database querying complexity from O(N) to O(1) in-memory lookups, supporting lightning-fast two-way reactive table sorting.
* **Mastery Badge Growth Formula**:
  * **🌱 Seedling (New)**: Tested 0 times, or has been tested but has a historical error rate exceeding 50%.
  * **🌿 Sprout (Growing)**: Tested at least once, with a historical error rate between 20% and 50%.
  * **🌳 Tree (Mastered)**: **Tested at least 3 times, and the cumulative error rate is strictly below 20%**. This rigorous evaluation ensures only repeatedly reviewed and deeply remembered words earn the "Tree (Mastered)" status, keeping progress assessments accurate.

---

## 🔌 Dual-Server Local CSV Persistence Middleware

To enable real-time local file system updates directly from a pure front-end Web SPA, VocabBloom registers a custom **Save CSV Middleware** within its Vite configuration.

### 1. Development & Production Preview Architecture Flow

```
  ┌──────────────────────────┐                  ┌──────────────────────────┐
  │  SetsView.tsx (Browser)  │                  │  vite.config.ts (Node)   │
  └────────────┬─────────────┘                  └────────────┬─────────────┘
               │                                             │
       Click "Save to Seed 💾"                              │
       Compile current set to CSV string                     │
               │                                             │
       POST to `/api/save-seed` ────────────────────────────>│
                                                            │ Parse JSON Body:
                                                            │ { setName, csvContent }
                                                            │
                                                            │ path.basename(setName)
                                                            │ sandbox traversal filter
                                                            │
                                                            │ fs.writeFileSync
                                                            │ overwrite corresponding seed file
                                                            │
                                <─── res.end({ success: true }) 
               │
     Pop-up success toast
```

### 2. Dual Hook Configurations for 100% Environment Parity

Vite plugin middlewares registered solely inside `configureServer` become inactive during `npm run build` production bundles or when running inside preview servers.
To guarantee identical file write-back capabilities across both `npm run dev` (Vite dev server) and `run-server.bat` (production preview), we register middleware hooks on both endpoint interfaces within [vite.config.ts](file:///z:/node/vacab/vite.config.ts):

```typescript
const saveCsvMiddleware = {
  name: 'save-csv-middleware',
  // A. Development Server Middleware Hook (configureServer)
  configureServer(server: any) {
    server.middlewares.use((req: any, res: any, next: any) => {
      handleSaveSeedRequest(req, res, next);
    });
  },
  // B. Production Preview Server Middleware Hook (configurePreviewServer)
  configurePreviewServer(server: any) {
    server.middlewares.use((req: any, res: any, next: any) => {
      handleSaveSeedRequest(req, res, next);
    });
  }
};
```

* **Filename Injection Defense (Path Traversal Protection)**: When parsing `setName` sent by the client, the Node.js backend filters the input via `path.basename(setName) + '.csv'`. This guarantees that regardless of any malicious relative elements (e.g., `../`), write operations are sandboxed inside `src/data/seeds/`, completely mitigating arbitrary directory traversal vulnerabilities.

---

## 🌐 External & Local API Data Flows (Network Architecture)

To enable metadata enrichment, multi-language translation, and physical seed file updates, VocabBloom implements three primary API interfaces:

### 1. DictionaryAPI for English Definitions & Phonetics
* **Calling Function**: `fetchDictionaryData(word)` (defined in [syncService.ts](file:///z:/node/vacab/src/syncService.ts))
* **Target URL**: `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`
* **Protocol & Request**: `GET`
* **Business Function**: Fetches international phonetic spellings, definitions, and native example sentences.
* **Pedagogical Filter Rules**: The retrieved sentences are checked using regex and word-counting filters to retain only minimal examples **between 3 and 12 words in length**, keeping cognitive load low.

### 2. MyMemory Translation API
* **Calling Function**: `fetchJapaneseTranslation(text)` (defined in [syncService.ts](file:///z:/node/vacab/src/syncService.ts))
* **Target URL**: `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|ja`
* **Protocol & Request**: `GET`
* **Business Function**: Translates the queried English words or examples into Japanese, and invokes the `cleanText()` function to strip any messy HTML artifacts returned by third-party services.

### 3. Local Seed Write-Back Persistence API
* **Calling Function**: `handleSaveToSeed()` (defined in [SetsView.tsx](file:///z:/node/vacab/src/components/SetsView.tsx))
* **Target URL**: `/api/save-seed`
* **Protocol & Request**: `POST` (JSON payload containing `setName` and `csvContent`)
* **Business Function**: Overwrites modifications made within the browser (new words, updated phonetics, definitions) back onto the physical CSV seeds under `src/data/seeds/[setName].csv`.
* **Sandbox Traversal Security**: Sanitizes request paths using `path.basename()` in the Vite middleware to completely shut down arbitrary file system directory traversal vulnerabilities.

---

## 🎨 Minimalist HSL Colors & Glassmorphism System

All app layouts, card styles, and theme transitions are styled through pure custom CSS in [index.css](file:///z:/node/vacab/src/index.css) without any bulky CSS utility libraries or frameworks.

### 1. Core Light/Dark HSL Color Scheme Token Table

The design system is driven by root attributes on the HTML node. By utilizing HSL color variables, we can transition smoothly between the warm light and cool dark presets by modifying hue, saturation, and lightness channels:

| CSS Token | Light Mode (Warm Peach-Cream) | Dark Mode (Tech-Mint Black) |
| :--- | :--- | :--- |
| `--bg-app` | `hsl(28, 40%, 97%)` (Warm Cream White) | `hsl(222, 25%, 10%)` (Deep Slate Grey) |
| `--bg-card` | `hsla(30, 30%, 100%, 0.7)` (Translucent Pure White) | `hsla(222, 20%, 18%, 0.65)` (Translucent Dark Grey) |
| `--color-primary` | `hsl(14, 85%, 63%)` (Vibrant Peach Pink) | `hsl(158, 64%, 52%)` (Tech Mint Green) |
| `--color-secondary` | `hsl(280, 55%, 65%)` (Romantic Taro Purple) | `hsl(250, 80%, 75%)` (Mystic Space Purple) |
| `--text-primary` | `hsl(20, 20%, 20%)` (Deep Charcoal Black) | `hsl(210, 20%, 95%)` (Sleek Off-White) |
| `--border-glass` | `rgba(255, 255, 255, 0.45)` | `rgba(255, 255, 255, 0.08)` |

### 2. Glassmorphism Design Token
To achieve a highly premium, tactile glass overlay feel, `.glass` is styled using the following native CSS property combination:
```css
.glass {
  background: var(--bg-card);
  border: 1px solid var(--border-glass);
  /* Hardware-accelerated viewport backdrop filters */
  backdrop-filter: blur(20px) saturate(140%);
  -webkit-backdrop-filter: blur(20px) saturate(140%);
  border-radius: 20px;
  box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.05);
}
```

---

## 🚀 Local Development & Deployment

### 1. Install Workspace Dependencies
Ensure Node.js (v18+ recommended) is installed on your local computer before beginning.
```bash
# 1. Forcefully clean stale TypeScript cache files (recommended after refactoring code)
npx tsc -b --clean

# 2. Install all node_modules dependencies
npm install
```

### 2. Debugging & Local Production Preview (Environment Parity)
VocabBloom provides two fluid options to launch locally:

- **Development Server (Hot Module Replacement)**:
  ```bash
  npm run dev
  ```
  Launches the local Vite HMR server, defaulting to `http://localhost:4173/`. Under this environment, clicking "Save to Seed 💾" in the browser immediately writes updates back to the `src/data/seeds/` directory.

- **Production Build Preview (Recommended for exact parity checks)**:
  To test the performance of the production bundle and review file persistence, run the customized execution script:
  ```powershell
  # Double-click run-server.bat in the root folder, or execute via CLI:
  ./run-server.bat
  ```
  The automated script performs the following steps sequentially:
  1. Scans and kills (`taskkill`) any stale processes running on port `4173` to prevent binding conflicts.
  2. Compiles code with the TypeScript compiler and builds production artifacts via `vite build` (executing Tree-Shaking).
  3. Launches `npm run preview` to spin up the production preview server. This server fully supports the same `/api/save-seed` write-back endpoints to update CSV seeds from port `4173`!

---

## 📁 Directory Structure & Source Code Layout

```
vacab/
├── src/
│   ├── components/
│   │   ├── SetsView.tsx       # Word sets dashboard. Integrates "Sync Seeds" merging, deduplication, sync report cloud tags, "Save to Seed" local write-backs, and CSV exports.
│   │   ├── LearnView.tsx      # 3D flashcard interface. Custom slow text-to-speech pronunciation, and YouGlish widget lifecycle & audio overlay supervisor.
│   │   ├── TestView.tsx       # Dual-mode quiz dashboard. Multiple-choice and spelling exercises with responsive slots grid, viewport readjustments for virtual keyboards, and haptic feedback.
│   │   └── DashboardView.tsx  # Analytics dashboard. Dynamic double-sorted vocabulary performance tables and automated seedling/sprout/tree growth formula status.
│   ├── hooks/
│   │   └── useQuiz.ts         # Quiz finite-state custom Hook. Manages spelling matching, auto-submit checks, three-tier distractor fetches, and test logging transactions.
│   ├── services/
│   │   ├── statsService.ts    # Analytics aggregator service. Employs O(1) single-pass memory indexes over IndexedDB transaction pools to generate views, tests, and active learning trends.
│   │   ├── speechService.ts   # Text-to-Speech manager. Configures slow rate limiters (0.85x), forces US-English synthesizers, and cancels prior tracks to avoid collision.
│   │   └── csvService.ts      # CSV RFC-4180 transcoder. Creates formatted CSV payloads and forces UTF-8 BOM encoding for seamless Microsoft Excel compatibility.
│   ├── utils/
│   │   └── arrayUtils.ts      # Functional array helpers. Implements Knuth/Fisher-Yates shuffling and alphabetical or error-rate based sorting arrays.
│   ├── data/
│   │   └── seeds/             # Included CSV vocabulary seed databases (e.g., Essential Travel Words, Primary Basics 101).
│   ├── csvUtils.ts            # Comprehensive RFC-4180 CSV tokenizer, securing text fields with double quotes, newlines, and commas.
│   ├── syncService.ts         # Metadata autocomplete controller. Filters DictionaryAPI descriptions to match primary student requirements, cascading to MyMemory translations.
│   ├── db.ts                  # Database schema topology using Dexie.js. Houses the transactional synchronization algorithms and initial seeder records.
│   ├── App.tsx                # Main React SPA hub. Handles root Dexie bootstrapping, light/dark theme tracking with reactive CSS variables, and route routing.
│   ├── index.css              # Pure hand-written HSL stylesheet. Declares theme palette variables, glassmorphism tokens, and 3D hover micro-animations.
│   └── main.tsx               # App mounting entrypoint
├── public/
│   └── favicon.svg            # App Peach Icon/Logo
├── vite.config.ts             # Vite configurations. Binds `saveCsvMiddleware` to configureServer & configurePreviewServer, protecting SMB/Z: drive paths during builds.
├── run-server.bat             # One-click Windows batch script. Frees port binding conflicts, builds code, and initializes production previews.
├── package.json               # Workspace project settings and dependencies.
└── tsconfig.app.json          # Client-side TypeScript target compiler rules.
```
