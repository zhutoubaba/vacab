import Dexie, { type Table } from 'dexie';
import { parseVocabularyCSV } from './csvUtils';

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

// Import all CSV files dynamically under src/data/seeds
const csvModules = import.meta.glob('./data/seeds/*.csv', {
  query: '?raw',
  eager: true,
}) as Record<string, { default: string }>;

/**
 * Automatically seeds the database with preset word sets and words from local
 * static CSV resources during the initial launch, if the database is currently empty.
 * 
 * @returns {Promise<void>}
 */
export async function seedDatabase() {
  // Step 1: Check database count to skip seeding if data already exists (prevents overwriting user customizations)
  const setExactCount = await db.wordSets.count();
  if (setExactCount > 0) return; 

  // Step 2: Loop through each dynamically imported seed CSV module
  for (const [path, module] of Object.entries(csvModules)) {
    const csvContent = module.default;
    if (!csvContent) continue;

    // Step 3: Derive a clean set name by parsing the CSV filename (e.g. "/seeds/Primary Basics 101 🌱.csv" -> "Primary Basics 101 🌱")
    const filename = path.split('/').pop() || '';
    const setName = filename.replace(/\.csv$/, '');

    // Step 4: Register the new Word Set in the database and capture its auto-incremented primary key (setId)
    const setId = await db.wordSets.add({
      name: setName,
      created_at: new Date()
    });

    // Step 5: Decode the CSV content using the RFC-4180 parsing core utility
    const parsedRows = parseVocabularyCSV(csvContent);
    const wordsToSeed: Omit<Word, 'id'>[] = parsedRows
      .filter(row => row.word)
      .map(row => ({
        set_id: setId,
        word: row.word,
        phonetic: row.phonetic || '',
        definition_en: row.definition_en || '',
        definition_ja: row.definition_ja || '',
        sentences: row.sentences || [],
        created_at: new Date()
      }));

    // Step 6: Perform high-performance bulk insertions to populate words efficiently in a single operation
    if (wordsToSeed.length > 0) {
      await db.words.bulkAdd(wordsToSeed);
    }
  }
}

export interface SyncReport {
  addedCount: number;
  skippedCount: number;
  skippedWords: string[];
}

/**
 * Synchronizes the local database with static seed CSV files without removing or overwriting
 * existing user-modified words or learning records.
 * 
 * @returns {Promise<SyncReport>} A promise resolving to a report detailing added and preserved words.
 */
export async function syncSeedsToDatabase(): Promise<SyncReport> {
  const report: SyncReport = {
    addedCount: 0,
    skippedCount: 0,
    skippedWords: []
  };

  // Step 1: Iterate over statically mapped seed CSV resources
  for (const [path, module] of Object.entries(csvModules)) {
    const csvContent = module.default;
    if (!csvContent) continue;

    // Step 2: Derive the set name from the filename
    const filename = path.split('/').pop() || '';
    const setName = filename.replace(/\.csv$/, '');

    // Step 3: Check if the word set already exists locally in IndexedDB
    let wordSet = await db.wordSets.where('name').equals(setName).first();
    let setId: number;

    if (!wordSet) {
      // If missing, initialize a new set entry
      setId = await db.wordSets.add({
        name: setName,
        created_at: new Date()
      });
    } else {
      setId = wordSet.id!;
    }

    // Step 4: Load existing words under this set to build an O(1) in-memory lookup map
    // This allows sub-millisecond duplicate checks and preserves user manual modifications.
    const existingWords = await db.words.where('set_id').equals(setId).toArray();
    const existingWordMap = new Map<string, Word>();
    for (const w of existingWords) {
      existingWordMap.set(w.word.toLowerCase().trim(), w);
    }

    // Step 5: Parse the static CSV content and build the batch import array
    const parsedRows = parseVocabularyCSV(csvContent);
    const wordsToAdd: Omit<Word, 'id'>[] = [];

    for (const row of parsedRows) {
      if (!row.word) continue;
      const normalizedWord = row.word.toLowerCase().trim();

      if (existingWordMap.has(normalizedWord)) {
        // Increment skip count to preserve local changes and learning logs
        report.skippedCount++;
        if (!report.skippedWords.includes(row.word)) {
          report.skippedWords.push(row.word);
        }
      } else {
        // Register word for batch bulk insertion
        wordsToAdd.push({
          set_id: setId,
          word: row.word,
          phonetic: row.phonetic || '',
          definition_en: row.definition_en || '',
          definition_ja: row.definition_ja || '',
          sentences: row.sentences || [],
          created_at: new Date()
        });
        report.addedCount++;
      }
    }

    // Step 6: Commit all newly discovered vocabulary words inside a high-speed bulk database write
    if (wordsToAdd.length > 0) {
      await db.words.bulkAdd(wordsToAdd);
    }
  }

  return report;
}


