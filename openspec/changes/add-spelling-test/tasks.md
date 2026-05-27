## 1. UI Navigation & Test Challenge Selection Screen

- [x] 1.1 Add states `testMode: 'choice' | 'spelling' | null` to `TestView.tsx`.
- [x] 1.2 Implement the Select Test Challenge Landing screen when `activeSetId` is selected but `testMode` is null, rendering two beautifully styled glassmorphism cards for Multiple Choice Quiz and Spelling Test.
- [x] 1.3 Add a back button on the mode selector screen to return to the word sets selector by calling `onSelectSet(0)`.
- [x] 1.4 Update mode selections to correctly set `testMode` state and trigger word loading.

## 2. Interactive Spelling Test Engine

- [x] 2.1 Add spelling states `typedAnswer: string`, `spellingChecked: boolean`, and `spellingCorrect: boolean` to `TestView.tsx`.
- [x] 2.2 Implement the normalized helper:
  `const normalizeWord = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '');`
- [x] 2.3 Implement the visual letter boxes rendering logic, displaying sequential user letters inside boxes, while automatically preserving dashes, spaces, and other punctuation as visual guides.
- [x] 2.4 Add a hidden or custom-styled text input field that auto-focuses, with `maxLength` capped at the target word's length, allowing users to type on any keyboard.
- [x] 2.5 Implement the auto-check trigger: when the user's typed normalized string length matches the target word's normalized length, immediately trigger verification, lock the input, log to database, and play mistake vibration if incorrect.
- [x] 2.6 Implement visual feedback for checked states: glowing green border/icon for Correct, and glowing red border/icon showing user spelling with the correct spelling printed in green.

## 3. Web Speech TTS Integration

- [x] 3.1 Implement the pacing-optimized speak helper:
  ```typescript
  const speakWord = (word: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = 'en-US';
      utterance.rate = 0.85;
      window.speechSynthesis.speak(utterance);
    }
  };
  ```
- [x] 3.2 Hook up `speakWord` to trigger inside a `useEffect` when `currentIndex` changes (during Spelling Test), providing seamless audio autoplay on card loads.
- [x] 3.3 Add a clean, responsive volume/speaker button to allow students to replay pronunciation anytime.

## 4. Verification & Testing

- [x] 4.1 Verify that entering the test view displays the Select Test Challenge screen.
- [x] 4.2 Verify that clicking "Spelling Test" begins the test, automatically speaks the first word, and renders the correct number of empty boxes.
- [x] 4.3 Verify that typing immediately populates the letter boxes.
- [x] 4.4 Verify that typing the final letter triggers immediate verification (auto-check) and freezes input.
- [x] 4.5 Verify that hyphens and spaces (e.g. in `ice-cream`) are automatically ignored during spelling checking, so typing `icecream` is marked correct.
- [x] 4.6 Verify that results are successfully logged in IndexedDB, and stats on the dashboard are updated.
