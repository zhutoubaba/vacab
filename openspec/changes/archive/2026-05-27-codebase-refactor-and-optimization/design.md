## Context

VocabBloom is a client-side vocabulary learning application running on Vite + React, backed by Dexie/IndexedDB for offline capabilities. To elevate the app's performance, code quality, and styling architecture to Google and Meta's engineering standards, we need to restructure our logical layout and design system. 

This design document outlines:
1. The **Batch-Join Query Engine** to bypass IndexedDB thread locking.
2. A **Custom Hook & Service Layer** to decouple monolithic files.
3. A **Sophisticated CSS Design System** upgrade utilizing HSL tokens, micro-interactions, and premium layouts.

---

## Goals / Non-Goals

### Goals:
* **$O(1)$ IndexedDB Hits**: Reduce vocabulary loading from $O(N)$ async queries to a single batch call.
* **100% Component Decoupling**: Separate heavy modules (CSV, TTS, Stats, Quizzes) into standalone, testable units.
* **Maintainability & Readability**: Shrink monolithic files by 60%-70% by extracting layout structures.
* **Haptic / Vibration Clean Up**: Completely eliminate all legacy device-level `navigator.vibrate` calls in learning and testing components to streamline visual/auditory haptic cycles and reduce mobile system constraints.
* **Premium Design Upgrades**: Refine HSL color profiles, add hardware-accelerated animations, and establish flawless viewport constraints.

### Non-Goals:
* **No Database Schema Changes**: Avoid database migrations. Maintain compatibility with existing IndexedDB schemas (WordSet, Word, ViewLog, TestLog) to safeguard users' learning data.

---

## Decisions

### 1. Batch Join Mapping Engine (`src/services/statsService.ts`)

To avoid the N+1 database querying anti-pattern, we query all logs for the current set in bulk and perform an in-memory hash join:

```typescript
import { db, type Word } from '../db';

export interface WordWithStats extends Word {
  views: number;
  tests: number;
  errors: number;
  errorRate: number;
  daysActive: number;
}

export const statsService = {
  async getWordsWithStats(setId: number): Promise<WordWithStats[]> {
    const rawWords = await db.words.where('set_id').equals(setId).toArray();
    const wordIds = rawWords.map(w => w.id!).filter(Boolean);

    if (wordIds.length === 0) return [];

    // 1. Fetch related logs in a single parallel batch query
    const [viewLogs, testLogs] = await Promise.all([
      db.viewLogs.where('word_id').anyOf(wordIds).toArray(),
      db.testLogs.where('word_id').anyOf(wordIds).toArray()
    ]);

    // 2. Populate hash maps with O(1) lookups
    const viewsMap = new Map<number, number>();
    const testsMap = new Map<number, typeof testLogs>();
    const activeDatesMap = new Map<number, number>(); // Stores min viewed time

    for (const log of viewLogs) {
      viewsMap.set(log.word_id, (viewsMap.get(log.word_id) || 0) + 1);
      
      const time = log.viewed_at.getTime();
      const currentMin = activeDatesMap.get(log.word_id);
      if (currentMin === undefined || time < currentMin) {
        activeDatesMap.set(log.word_id, time);
      }
    }

    for (const log of testLogs) {
      if (!testsMap.has(log.word_id)) {
        testsMap.set(log.word_id, []);
      }
      testsMap.get(log.word_id)!.push(log);
    }

    const now = new Date().getTime();

    // 3. Assemble enriched models instantly in-memory
    return rawWords.map(w => {
      const wordId = w.id!;
      const views = viewsMap.get(wordId) || 0;
      
      const tLogs = testsMap.get(wordId) || [];
      const tests = tLogs.length;
      const errors = tLogs.filter(l => !l.is_correct).length;
      const errorRate = tests > 0 ? Math.round((errors / tests) * 100) : 0;

      const firstViewTime = activeDatesMap.get(wordId);
      const daysActive = firstViewTime 
        ? Math.max(0, Math.ceil((now - firstViewTime) / (1000 * 60 * 60 * 24)) - 1)
        : 0;

      return {
        ...w,
        views,
        tests,
        errors,
        errorRate,
        daysActive
      };
    });
  }
};
```

---

### 2. State-Decoupling Hook Contract (`src/hooks/useQuiz.ts`)

The Custom React Hook `useQuiz` completely isolates testing engines, multiple-choice option creation, and spelling verification:

```typescript
export interface QuizOption {
  text: string;
  isCorrect: boolean;
}

export function useQuiz(activeSetId: number | null, sortBy: 'random' | 'alphabetical' | 'error_rate') {
  // Encapsulated states:
  // - words, currentIndex, score, quizFinished
  // - activeTestMode ('choice' | 'spelling' | null)
  // - multiChoiceOptions, selectedOptionIndex, isAnswered
  // - typedSpellingAnswer, spellingChecked, spellingCorrect
  
  // Encapsulated behaviors:
  // - loadQuizWords() (uses batch query from statsService)
  // - generateQuizOptions() (collects distractors securely from IndexedDB)
  // - handleSelectOption() (writes testLogs, updates score)
  // - triggerSpellingCheck() (normalizes and checks typing instantly)
  // - nextQuestion()
  // - restartQuiz()
}
```

---

### 3. Upgrading style tokens and micro-interactions (`src/index.css`)

To make the styling look and feel premium, we will modernize the design system tokens:

* **Vibrant Glassmorphism and Backdrop Blurs**: Transition card backdrops to utilize dynamic overlay values with sophisticated glass textures.
* **Micro-Animations for UI Delight**: Introduce active interactive state scale scaling (`transform: scale(0.98)`), focus-ring glows utilizing primary soft glow colors, and smooth 3D flip ease values (`cubic-bezier(0.34, 1.56, 0.64, 1)`).
* **Absolute Mobile Viewport Management**: Optimize bottom navigation anchors to auto-hide dynamically during viewport sizing shifts (triggered by mobile keyboard focusing).

---

## Directory Architecture Blueprint

Below is the directory structure we will build to establish Google/Meta-grade codebase standards:

```
src/
├── assets/
├── components/
│   ├── common/
│   │   ├── Badge.tsx           <-- Mastery level badges
│   │   └── Modal.tsx           <-- Unified glassmorphic modal
│   ├── dashboard/
│   │   └── StatsTable.tsx      <-- Compact learning stats grid
│   ├── learn/
│   │   ├── Flashcard.tsx       <-- Decoupled 3D Flipping card
│   │   └── YouGlishViewer.tsx  <-- YouGlish widget controller
│   ├── test/
│   │   ├── ChoiceMode.tsx      <-- Clean Choice quiz panel
│   │   ├── SpellingMode.tsx    <-- Premium spelling test panel
│   │   └── Celebration.tsx     <-- High-fidelity completion display
│   ├── DashboardView.tsx
│   ├── LearnView.tsx
│   ├── SetsView.tsx
│   └── TestView.tsx
├── data/
│   └── seeds/
├── hooks/
│   └── useQuiz.ts              <-- Decoupled quiz logic
├── services/
│   ├── csvService.ts           <-- Pure CSV Import/Export
│   ├── speechService.ts        <-- Central TTS engine
│   └── statsService.ts         <-- Optimized batch database calls
├── utils/
│   └── arrayUtils.ts           <-- Shared shuffle & sort methods
├── App.tsx
├── csvUtils.ts
├── db.ts
├── index.css
├── main.tsx
└── syncService.ts
```

---

## Risks / Trade-offs

* **Development Effort**: Restructuring a tightly coupled codebase requires comprehensive, step-by-step modularization to avoid breaking existing views.
  - *Mitigation*: We will perform changes incrementally. We will build pure services and hooks first, verify them with tests and isolated rendering, and then swap out component logic file-by-file.
