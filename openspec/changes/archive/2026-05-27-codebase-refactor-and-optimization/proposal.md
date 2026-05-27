## Why

To transform VocabBloom into an industry-grade, ultra-premium application akin to products engineered at tech giants like Google and Meta, we must address critical code health, architectural scaling, and performance issues. Currently, the codebase displays three primary limitations:

1. **The $N+1$ Database Query Bottleneck**: 
   `DashboardView.tsx`, `LearnView.tsx`, and `TestView.tsx` perform sequential, parallelized database inquiries in `.map` callbacks. Loading a set of $N$ words initiates up to $2 \times N$ database queries in a single wave. When a word set scales, this causes noticeable main-thread execution stutters, layout lag, and rapid battery drainage on mobile viewports.

2. **Monolithic Component Files**:
   Views like `SetsView.tsx` (782 lines) and `TestView.tsx` (779 lines) carry out massive amounts of logic, combining UI styling, state control, database CRUD operations, API sync/throttle pacing, drag-and-drop file operations, and Text-to-Speech (TTS) integration. This makes debugging, extending, and automated testing extremely difficult.

3. **Duplicated Utility Logic**:
   The same code for browser Web Speech TTS, array Fisher-Yates shuffling, active sort mode switching, and CSV parsing/formatting is copy-pasted across multiple component files.

By resolving these issues through elegant architecture, we will achieve bulletproof performance, exceptional code readability, and a highly maintainable base that scales smoothly.

---

## What Changes

We will restructure the application by separating UI Presentation from business and data operations, introducing batch query patterns, extracting common utilities, and stripping legacy hardware calls:

1. **Performance Layer: Batch Joins**:
   - Establish a dedicated database stats mapping service.
   - Replace the $N+1$ parallel query engine with single-pass bulk operations: fetch all view and test logs in a single operational step, then map them instantly using in-memory hash maps ($O(1)$ lookup complexity).
   
2. **Modular View Components**:
   - Break up massive view files into pure, compact layout files.
   - Move state management and quiz distractors/grading systems into dedicated Custom React Hooks.
   - Segment large blocks like modal overlays, upload blocks, and custom keyboard inputs into isolated, reusable sub-components.

3. **Global Service Layer**:
   - **`speechService.ts`**: Single module for audio pronunciation controls, handling queue cancellation, browser speed rates, and cross-browser error fallbacks.
   - **`csvService.ts`**: Dedicated service for reading and validation of CSV files, mapping column indices, and compiling/triggering clean CSV file downloads.
   - **`statsService.ts`**: Optimized batch data loaders for vocabulary stats, views, and error rates.
   
4. **General Utilities**:
   - **`arrayUtils.ts`**: Centralize array shuffling, alphabetizing, and difficulty-based sorting logic.

5. **Legacy Haptic/Vibration Clean Up**:
   - Completely remove legacy device vibration calls (`navigator.vibrate`) in test grading and swiping blocks to clean up side-effects, simplify device-level requirements, and focus purely on visual/auditory feedback loops.

---

## Capabilities

### New Capabilities
- `vocab-batch-stats`: Instant, high-speed batch calculations for word views, test errors, and mastery calculations, avoiding multi-query thread lockups.
- `vocab-common-services`: Centralized services for speech audio (TTS), array utilities, and CSV importation and exportation.

### Modified Capabilities
- `vocab-learn`: Refactored to leverage centralized speech services, optimized stats mapper, and shared sort controllers.
- `vocab-test`: Modularized spelling and choice mode interfaces, driven by a dedicated state hook.
- `vocab-sets`: Stripped of file read interfaces and CSV compiler operations, transitioning to a clean directory management view.

---

## Impact

- `src/utils/arrayUtils.ts` `[NEW]`: Pure functions for Fisher-Yates array shuffling and vocabulary sorting.
- `src/services/speechService.ts` `[NEW]`: Centralized audio speech player with speech rate and compatibility fallbacks.
- `src/services/csvService.ts` `[NEW]`: Modularized CSV parsing, validating, and download compiling logic.
- `src/services/statsService.ts` `[NEW]`: Single-pass database joins and statistics calculator.
- `src/hooks/useQuiz.ts` `[NEW]`: Custom hook managing quiz state, distractor options, user inputs, and score telemetry.
- `src/components/DashboardView.tsx` `[MODIFY]`: Rewired to load statistical charts via `statsService`.
- `src/components/LearnView.tsx` `[MODIFY]`: Decoupled into modular components, leveraging `statsService` and `speechService`.
- `src/components/SetsView.tsx` `[MODIFY]`: Extracted CSV and single-word sync triggers. Split into manageable sub-views.
- `src/components/TestView.tsx` `[MODIFY]`: Transitioned spelling and selection views to use `useQuiz`. Split layouts.
