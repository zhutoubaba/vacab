## Why

Currently, VocabBloom only supports multiple-choice vocabulary tests for Japanese definitions. While multiple-choice quizzes are excellent for passive word recognition, they do not train active recall, orthography, or spelling accuracy. 

To create a truly comprehensive language-learning experience, we need a **Spelling Test** mode. Students should be able to:
1. Hear the native English pronunciation of the word (Web Speech TTS).
2. See the Japanese definition as context.
3. Type the word's spelling on their device.
4. Get instant, color-coded visual feedback with mistake correction.
5. Have their spelling progress recorded in their global statistics to automatically feed into their dashboard mastery badges (Seedling, Sprout, Growing, Tree).

## What Changes

- **Test Challenge Selector**: After selecting a vocabulary set in the **Test** tab, the user is presented with a beautiful, high-fidelity card selector allowing them to choose their challenge:
  - **Multiple Choice Quiz** (existing Japanese translation quiz).
  - **Spelling Test** (new auditory and keyboard orthography quiz).
- **Web Speech TTS Autoplay**: When a spelling card is loaded, the browser automatically plays the English pronunciation using the native Web Speech Synthesis API, with a dedicated 🔊 button to replay at a highly clear, paced rate (`0.85`).
- **Interactive Letter Slots (`_ _ _`)**: Renders a premium grid of letter slot boxes representing the target word. Non-alphanumeric characters (spaces, hyphens, punctuation) are preserved as fixed visual separators.
- **Smart Letter Distribution UX**: As the user types, their letters automatically populate the available alphabetical slots sequentially, ignoring spaces and hyphens visually.
- **Normalized Auto-Verification**: The moment the user types the last letter, the spelling is automatically checked. Verification ignores spaces, hyphens, punctuation, and casing (e.g. `icecream` is accepted as correct for `ice-cream`).
- **Vibration & Database Logging**: Incorrect answers trigger phone vibration haptics. All results (correctness and typed words) are logged directly to the shared `db.testLogs` database, which integrates spelling mastery naturally with the global Stats dashboard.

## Capabilities

### New Capabilities
- `vocab-spelling-test`: Support active recall spelling tests using Web Speech TTS, customized letter slots layout, and instant spelling verification.

### Modified Capabilities
- `vocab-test`: Retained the 4-choice translation quiz and introduced a Test Challenge Selection screen when choosing a vocabulary set.

## Impact

- `src/components/TestView.tsx`: Integrate the new Test Mode selection page, implement the Spelling Test core quiz engine, handle audio play, auto-check typing handlers, and record results.
