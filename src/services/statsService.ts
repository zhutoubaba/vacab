import { db, type Word } from '../db';

export interface WordWithStats extends Word {
  views: number;
  tests: number;
  errors: number;
  errorRate: number;
  daysActive: number;
}

export const statsService = {
  /**
   * Fetches vocabulary words for a given word set (or all sets) and enriches them
   * with views, quizzes, errors, and active days using an optimized single-pass batch query join.
   * This reduces query hits from O(N) database operations down to O(1) in-memory aggregation.
   * 
   * @param {number | 'all'} setId - The unique ID of the word set, or 'all' to aggregate all sets.
   * @returns {Promise<WordWithStats[]>} A promise resolving to the enriched vocabulary words array with metrics.
   */
  async getWordsWithStats(setId: number | 'all'): Promise<WordWithStats[]> {
    let rawWords: Word[] = [];

    // Step 1: Query the raw vocabulary records from IndexedDB (either all words or filtered by set ID)
    if (setId === 'all') {
      rawWords = await db.words.toArray();
    } else {
      rawWords = await db.words.where('set_id').equals(Number(setId)).toArray();
    }

    const wordIds = rawWords.map(w => w.id!).filter(id => id !== undefined);
    if (wordIds.length === 0) return [];

    // Step 2: Fetch all related view and test logs in a single parallel batch query
    // By utilizing a single 'anyOf' batch query instead of querying inside a loop,
    // database I/O hits are compressed from O(N) down to a constant O(1) operations.
    const [allViewLogs, allTestLogs] = await Promise.all([
      db.viewLogs.where('word_id').anyOf(wordIds).toArray(),
      db.testLogs.where('word_id').anyOf(wordIds).toArray()
    ]);

    // Step 3: Aggregate the fetched logs inside high-performance in-memory lookup maps
    // viewsMap counts total exposures, activeDatesMap tracks the first view time, and testsMap groups quizzes.
    const viewsMap = new Map<number, number>();
    const activeDatesMap = new Map<number, number>();
    const testsMap = new Map<number, typeof allTestLogs>();

    for (const log of allViewLogs) {
      viewsMap.set(log.word_id, (viewsMap.get(log.word_id) || 0) + 1);

      const logTime = log.viewed_at.getTime();
      const currentMin = activeDatesMap.get(log.word_id);
      if (currentMin === undefined || logTime < currentMin) {
        activeDatesMap.set(log.word_id, logTime);
      }
    }

    for (const log of allTestLogs) {
      if (!testsMap.has(log.word_id)) {
        testsMap.set(log.word_id, []);
      }
      testsMap.get(log.word_id)!.push(log);
    }

    const nowTime = new Date().getTime();

    // Step 4: Map and enrich the raw vocabulary words with computed metrics instantly in-memory
    // Calculates view totals, test quiz counts, error rate percentages, and elapsed active days.
    return rawWords.map((w) => {
      const wordId = w.id!;
      const views = viewsMap.get(wordId) || 0;

      const tLogs = testsMap.get(wordId) || [];
      const tests = tLogs.length;
      const errors = tLogs.filter(l => !l.is_correct).length;
      const errorRate = tests > 0 ? Math.round((errors / tests) * 100) : 0;

      const firstViewTime = activeDatesMap.get(wordId);
      const daysActive = firstViewTime
        ? Math.max(0, Math.ceil((nowTime - firstViewTime) / (1000 * 60 * 60 * 24)) - 1)
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
