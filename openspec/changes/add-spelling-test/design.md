## Context

VocabBloom is a client-side Vite + React application using browser-native Dexie/IndexedDB databases. Adding a spelling test mode requires high-fidelity front-end states, audio auto-play handling, responsive mobile-friendly text inputs, and database logging that seamlessly matches the existing test execution schemas.

## Goals / Non-Goals

**Goals:**
- **Select Challenge UI**: Add a premium landing state for `TestView` where users select their quiz type.
- **Auditory spelling training**: Auto-speak word on load at speed `0.85`, with a button to trigger replay (no animated waveforms on the speak button).
- **Flexible Punctuation Checking**: Ignore casing, hyphens, spaces, and punctuation during verification.
- **Auto-check on Last Letter**: Trigger checking immediately when user types the final character (matching normalized word length).
- **Premium Letter Boxes**: Render a sequential slot grid for user letters, keeping spaces and symbols fixed.
- **Log spelling tests**: Write typed words directly to `db.testLogs` to feed global statistics seamlessly.

**Non-Goals:**
- **No virtual keyboards**: Do not implement custom screen keypads. Rely entirely on native browser/mobile keyboards for maximum accessibility, swipe typing, and autocorrect integration.

## Decisions

### 1. Flexible Punctuation Normalization Engine
- **Rationale**: For phrases like `primary school` or `ice-cream`, students shouldn't fail simply because they forgot a space or a dash. The verification system will clean strings by removing all non-alphanumeric characters and lowercasing:
  ```typescript
  const normalizeWord = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '');
  ```
  Correctness is verified instantly when `normalizeWord(typedAnswer) === normalizeWord(activeWord.word)`.

### 2. Auto-Check Trigger on Match Length
- **Rationale**: To speed up spelling practice, the test will automatically submit the answer the moment the user types the final letter, avoiding the extra step of clicking "Check".
- **Implementation**: The target word's normalized length is calculated. When the user's normalized typed string reaches this length, verification triggers immediately:
  ```typescript
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTypedAnswer(val);

    const normTarget = normalizeWord(activeWord.word);
    const normTyped = normalizeWord(val);

    if (normTyped.length === normTarget.length) {
      // Trigger instant check!
      triggerCheck(val);
    }
  };
  ```

### 3. Smart Letter Slots Grid Distribution
- **Rationale**: If target is `ice-cream` (9 chars, 8 letters) and the user types `icecream` (8 letters), we want the letters to align nicely with the blank boxes, skipping the hyphen box.
- **Algorithm**: We extract only alphanumeric characters typed by the user, and distribute them sequentially to the alphabetical indices of the target word:
  ```typescript
  const renderSlots = (targetWord: string, typedText: string) => {
    const userChars = typedText.toLowerCase().replace(/[^a-z0-9]/g, '').split('');
    let userCharIdx = 0;

    return targetWord.split('').map((char, index) => {
      const isLetter = /[a-zA-Z0-9]/.test(char);

      if (!isLetter) {
        // Automatically render fixed visual separators for non-letters (spaces, hyphens)
        return (
          <span key={index} className="spelling-char-separator">
            {char === ' ' ? '\u00A0\u00A0' : char}
          </span>
        );
      }

      // Letter box
      const userChar = userChars[userCharIdx];
      userCharIdx++;
      const isFilled = userChar !== undefined;

      return (
        <span key={index} className={`spelling-letter-box ${isFilled ? 'filled' : 'empty'}`}>
          {isFilled ? userChar : '_'}
        </span>
      );
    });
  };
  ```

### 4. Zero-database-modification logging
- **Rationale**: By logging spelling tests directly into `db.testLogs` with `is_correct` and the user's typed value in `selected_option`, we gain instant telemetry. The existing dashboard code aggregates stats globally by reading:
  - `tests = testLogs.length`
  - `errors = testLogs.filter(l => !l.is_correct).length`
  Spelling test sessions will naturally influence mastery badges (`🌱 Seedling` ➔ `🌿 Sprout` ➔ `🌳 Tree`) automatically!

## Risks / Trade-offs

- **[Risk] Autoplay Blocking**: Standard browsers block autoplay audio unless there was prior user interaction.
  - *Mitigation*: The user must select their test mode ("Spelling Test" card) in the UI. This counts as direct user interaction, allowing SpeechSynthesis autoplay to function flawlessly on launch.
