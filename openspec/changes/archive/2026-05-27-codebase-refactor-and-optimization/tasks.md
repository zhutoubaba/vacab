## 1. Pure Utilities & Base Services

- [x] 1.1 Create `src/utils/arrayUtils.ts` containing pure Fisher-Yates `shuffleArray` and active sorting helpers (`sortVocabulary`), and remove duplicated shuffle logic.
- [x] 1.2 Create `src/services/speechService.ts` to manage Web Speech Synthesis, audio pacing (`0.85`), active play state cleanup, and browser fallbacks.
- [x] 1.3 Create `src/services/csvService.ts` containing CSV upload parsing, schema validation, and CSV exporter triggers.
- [x] 1.4 Create `src/services/statsService.ts` implementing the high-performance $O(1)$ batch-join IndexedDB mapping for word view and test stats.

## 2. Legacy Haptic/Vibration Cleanup

- [x] 2.1 Remove legacy device vibration commands (`navigator.vibrate` calls) inside correct/incorrect swiping handlers in `LearnView.tsx`.
- [x] 2.2 Remove legacy device vibration commands (`navigator.vibrate` calls) in correct/incorrect multiple-choice and spelling grading in `TestView.tsx`.

## 3. Custom Hooks & Business Logic Extraction

- [x] 3.1 Create `src/hooks/useQuiz.ts` custom hook to isolate spelling input matching, distractor generation, score tracking, database writing, and navigation states.

## 4. Component Refactoring & Modularization

- [x] 4.1 Refactor `src/components/DashboardView.tsx` to leverage the high-performance `statsService.ts` batch join data loads, cleaning up redundant loops.
- [x] 4.2 Refactor `src/components/LearnView.tsx` to utilize `statsService.ts` for stats, `speechService.ts` for text-to-speech, and `arrayUtils.ts` for shuffling/sorting.
- [x] 4.3 Refactor `src/components/SetsView.tsx` to delegate CSV import/export functions to `csvService.ts`, decoupling file reads and DOM download hooks.
- [x] 4.4 Refactor `src/components/TestView.tsx` to utilize `useQuiz.ts` custom hook, stripping massive state mappings, distractor generator algorithms, and separate spelling slots inputs.

## 5. Verification & Performance Validation

- [x] 5.1 Run the server and verify all four Views load instantly with zero console errors.
- [x] 5.2 Validate that the N+1 database queries are eliminated and replaced by batch reads in the console logs.
- [x] 5.3 Verify that text-to-speech works flawlessly on word card loads.
- [x] 5.4 Confirm that importing and exporting CSV datasets functions cleanly.
- [x] 5.5 Confirm that device vibration haptics are completely removed from all workflows.
