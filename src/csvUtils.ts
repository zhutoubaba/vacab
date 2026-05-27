/**
 * Highly robust RFC-4180 compliant CSV parser that converts raw CSV text
 * into a two-dimensional array of strings, properly handling embedded quotes,
 * commas, newlines, and varying line endings.
 * 
 * @param {string} csvContent - The raw text content of a CSV file.
 * @returns {string[][]} A two-dimensional array representing rows and columns.
 */
export function parseRawCSV(csvContent: string): string[][] {
  const result: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < csvContent.length; i++) {
    const char = csvContent[i];
    const nextChar = csvContent[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentField += '"';
        i++; // skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',') {
      if (inQuotes) {
        currentField += char;
      } else {
        currentRow.push(currentField);
        currentField = '';
      }
    } else if (char === '\r' || char === '\n') {
      if (inQuotes) {
        currentField += char;
      } else {
        // Handle CRLF or LF
        if (char === '\r' && nextChar === '\n') {
          i++; // skip \n
        }
        currentRow.push(currentField);
        result.push(currentRow);
        currentRow = [];
        currentField = '';
      }
    } else {
      currentField += char;
    }
  }

  // Push remaining elements
  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField);
    result.push(currentRow);
  }

  return result;
}

export interface ParsedVocabularyRow {
  word: string;
  phonetic: string;
  definition_en: string;
  definition_ja: string;
  sentences: string[];
}

/**
 * Parses vocabulary CSV content into a list of standardized vocabulary row objects.
 * Supports flexible layout structures such as pipe-separated sentences (e.g. "s1|s2") or
 * separate sentence columns (e.g., sentence_1, sentence_2, sentence_3).
 * 
 * @param {string} csvContent - The raw text content of the vocabulary CSV file.
 * @returns {ParsedVocabularyRow[]} An array of parsed and standardized vocabulary rows.
 */
export function parseVocabularyCSV(csvContent: string): ParsedVocabularyRow[] {
  const rows = parseRawCSV(csvContent);
  if (rows.length < 2) return [];

  // Identify headers case-insensitively
  const headers = rows[0].map(h => h.trim().toLowerCase());
  const wordIdx = headers.indexOf('word');
  
  if (wordIdx === -1) {
    return [];
  }

  const phoneticIdx = headers.indexOf('phonetic');
  const defEnIdx = headers.indexOf('definition_en');
  const defJaIdx = headers.indexOf('definition_ja');
  
  // Look for either a unified 'sentences' column or separate 'sentence_1', 'sentence_2', 'sentence_3'
  const sentencesIdx = headers.indexOf('sentences');
  const sentence1Idx = headers.indexOf('sentence_1');
  const sentence2Idx = headers.indexOf('sentence_2');
  const sentence3Idx = headers.indexOf('sentence_3');

  const result: ParsedVocabularyRow[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length === 0 || (row.length === 1 && !row[0].trim())) {
      continue; // Skip empty rows
    }

    const word = row[wordIdx] ? row[wordIdx].trim() : '';
    if (!word) continue; // Word is required

    const phonetic = phoneticIdx !== -1 && row[phoneticIdx] !== undefined ? row[phoneticIdx].trim() : '';
    const definition_en = defEnIdx !== -1 && row[defEnIdx] !== undefined ? row[defEnIdx].trim() : '';
    const definition_ja = defJaIdx !== -1 && row[defJaIdx] !== undefined ? row[defJaIdx].trim() : '';
    
    const sentences: string[] = [];

    // 1. Check for pipe-separated sentences
    if (sentencesIdx !== -1 && row[sentencesIdx]) {
      const splitSentences = row[sentencesIdx]
        .split('|')
        .map(s => s.trim())
        .filter(Boolean);
      sentences.push(...splitSentences);
    }

    // 2. Check for separate sentence columns
    if (sentence1Idx !== -1 && row[sentence1Idx] !== undefined && row[sentence1Idx].trim()) {
      sentences.push(row[sentence1Idx].trim());
    }
    if (sentence2Idx !== -1 && row[sentence2Idx] !== undefined && row[sentence2Idx].trim()) {
      sentences.push(row[sentence2Idx].trim());
    }
    if (sentence3Idx !== -1 && row[sentence3Idx] !== undefined && row[sentence3Idx].trim()) {
      sentences.push(row[sentence3Idx].trim());
    }

    result.push({
      word,
      phonetic,
      definition_en,
      definition_ja,
      sentences: sentences.slice(0, 3) // Cap at max 3 sentences
    });
  }

  return result;
}
