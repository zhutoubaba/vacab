import Dexie, { type Table } from 'dexie';

export interface WordSet {
  id?: number;
  name: string;
  created_at: Date;
}

export interface Word {
  id?: number;
  set_id: number;
  word: string;
  phonetic: string;
  definition_en: string;
  definition_ja: string;
  sentences: string[];
  created_at: Date;
}

export interface ViewLog {
  id?: number;
  word_id: number;
  viewed_at: Date;
}

export interface TestLog {
  id?: number;
  word_id: number;
  is_correct: boolean;
  selected_option: string;
  tested_at: Date;
}

export class VocabDatabase extends Dexie {
  wordSets!: Table<WordSet, number>;
  words!: Table<Word, number>;
  viewLogs!: Table<ViewLog, number>;
  testLogs!: Table<TestLog, number>;

  /**
   * Initializes the VocabBloom indexed database with tables and secondary indexes.
   * Maps table schemas for wordSets, words, viewLogs, and testLogs.
   */
  constructor() {
    super('VocabDatabase');
    this.version(1).stores({
      wordSets: '++id, name, created_at',
      words: '++id, set_id, word, created_at',
      viewLogs: '++id, word_id, viewed_at',
      testLogs: '++id, word_id, is_correct, tested_at'
    });
  }
}

export const db = new VocabDatabase();

/**
 * Automatically seeds the database with preset word sets and words from the remote
 * Turso libSQL database during the initial launch, if the local database is currently empty.
 * 
 * @returns {Promise<void>}
 */
export async function seedDatabase() {
  const setExactCount = await db.wordSets.count();
  if (setExactCount > 0) return; 

  const tursoUrl = import.meta.env.VITE_TURSO_URL;
  const tursoToken = import.meta.env.VITE_TURSO_TOKEN;

  if (!tursoUrl || !tursoToken) {
    console.warn('Turso connection details are not configured. Seeding skipped.');
    return;
  }

  const httpUrl = tursoUrl.replace(/^libsql:\/\//, 'https://') + '/v2/pipeline';

  try {
    const res = await fetch(httpUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tursoToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        requests: [
          { type: 'execute', stmt: { sql: 'SELECT id, name, created_at FROM word_sets;' } },
          { type: 'execute', stmt: { sql: 'SELECT set_id, word, phonetic, definition_en, definition_ja, sentences, created_at FROM words;' } }
        ]
      })
    });

    if (!res.ok) {
      throw new Error(`Turso HTTP Error: ${res.status}`);
    }

    const data = await res.json();
    if (!data.results || data.results.some((r: any) => r.type === 'error')) {
      throw new Error('Turso query pipeline failed');
    }

    const setsResult = data.results[0].response.result;
    const wordsResult = data.results[1].response.result;

    const tursoToDexieSetId = new Map<number, number>();

    // Step 1: Seed Word Sets
    for (const row of setsResult.rows) {
      const tursoId = parseInt(row[0].value, 10);
      const name = row[1].value;
      const created_at = new Date(row[2].value);

      const dexieId = await db.wordSets.add({
        name,
        created_at
      });
      tursoToDexieSetId.set(tursoId, dexieId);
    }

    // Step 2: Seed Words
    const wordsToSeed: Omit<Word, 'id'>[] = [];
    for (const row of wordsResult.rows) {
      const tursoSetId = parseInt(row[0].value, 10);
      const dexieSetId = tursoToDexieSetId.get(tursoSetId);
      if (!dexieSetId) continue;

      let sentences: string[] = [];
      try {
        sentences = JSON.parse(row[5].value || '[]');
      } catch (e) {
        sentences = [];
      }

      wordsToSeed.push({
        set_id: dexieSetId,
        word: row[1].value,
        phonetic: row[2].value || '',
        definition_en: row[3].value || '',
        definition_ja: row[4].value || '',
        sentences,
        created_at: new Date(row[6].value)
      });
    }

    if (wordsToSeed.length > 0) {
      await db.words.bulkAdd(wordsToSeed);
    }

    console.log(`Successfully seeded database with ${setsResult.rows.length} sets and ${wordsToSeed.length} words from libSQL.`);
  } catch (err) {
    console.error('Failed to load seed data from libSQL:', err);
  }
}

export interface SyncReport {
  addedCount: number;
  skippedCount: number;
  skippedWords: string[];
}

/**
 * Synchronizes the local IndexedDB database with vocabulary seeds retrieved dynamically
 * from the remote Turso libSQL database without overwriting manual user modifications.
 * 
 * @returns {Promise<SyncReport>} A promise resolving to a report detailing added and preserved words.
 */
export async function syncSeedsToDatabase(): Promise<SyncReport> {
  const report: SyncReport = {
    addedCount: 0,
    skippedCount: 0,
    skippedWords: []
  };

  const tursoUrl = import.meta.env.VITE_TURSO_URL;
  const tursoToken = import.meta.env.VITE_TURSO_TOKEN;

  if (!tursoUrl || !tursoToken) {
    console.warn('Turso connection details are not configured. Sync skipped.');
    return report;
  }

  const httpUrl = tursoUrl.replace(/^libsql:\/\//, 'https://') + '/v2/pipeline';

  try {
    const res = await fetch(httpUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tursoToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        requests: [
          { type: 'execute', stmt: { sql: 'SELECT id, name, created_at FROM word_sets;' } },
          { type: 'execute', stmt: { sql: 'SELECT set_id, word, phonetic, definition_en, definition_ja, sentences, created_at FROM words;' } }
        ]
      })
    });

    if (!res.ok) {
      throw new Error(`Turso HTTP Error: ${res.status}`);
    }

    const data = await res.json();
    if (!data.results || data.results.some((r: any) => r.type === 'error')) {
      throw new Error('Turso query pipeline failed');
    }

    const setsResult = data.results[0].response.result;
    const wordsResult = data.results[1].response.result;

    // Group Turso words by their set ID
    const setWordsMap = new Map<number, any[]>();
    for (const row of wordsResult.rows) {
      const setId = parseInt(row[0].value, 10);
      const word = row[1].value;
      const phonetic = row[2].value || '';
      const definition_en = row[3].value || '';
      const definition_ja = row[4].value || '';
      let sentences: string[] = [];
      try {
        sentences = JSON.parse(row[5].value || '[]');
      } catch {
        sentences = [];
      }
      const created_at = new Date(row[6].value);

      if (!setWordsMap.has(setId)) {
        setWordsMap.set(setId, []);
      }
      setWordsMap.get(setId)!.push({ word, phonetic, definition_en, definition_ja, sentences, created_at });
    }

    // Sync each word set
    for (const row of setsResult.rows) {
      const tursoSetId = parseInt(row[0].value, 10);
      const setName = row[1].value;

      // Check if word set exists in local IndexedDB
      let wordSet = await db.wordSets.where('name').equals(setName).first();
      let dexieSetId: number;

      if (!wordSet) {
        dexieSetId = await db.wordSets.add({
          name: setName,
          created_at: new Date()
        });
      } else {
        dexieSetId = wordSet.id!;
      }

      // Build quick O(1) in-memory duplicate check map of local words
      const existingWords = await db.words.where('set_id').equals(dexieSetId).toArray();
      const existingWordMap = new Map<string, Word>();
      for (const w of existingWords) {
        existingWordMap.set(w.word.toLowerCase().trim(), w);
      }

      const tursoWords = setWordsMap.get(tursoSetId) || [];
      const wordsToAdd: Omit<Word, 'id'>[] = [];

      for (const w of tursoWords) {
        const normalizedWord = w.word.toLowerCase().trim();
        if (existingWordMap.has(normalizedWord)) {
          report.skippedCount++;
          if (!report.skippedWords.includes(w.word)) {
            report.skippedWords.push(w.word);
          }
        } else {
          wordsToAdd.push({
            set_id: dexieSetId,
            word: w.word,
            phonetic: w.phonetic,
            definition_en: w.definition_en,
            definition_ja: w.definition_ja,
            sentences: w.sentences,
            created_at: new Date()
          });
          report.addedCount++;
        }
      }

      if (wordsToAdd.length > 0) {
        await db.words.bulkAdd(wordsToAdd);
      }
    }
  } catch (err) {
    console.error('Failed to sync seeds from Turso:', err);
  }

  return report;
}


