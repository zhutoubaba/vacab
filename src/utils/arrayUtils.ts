/**
 * Shuffles an array using the Fisher-Yates (Knuth) shuffle algorithm.
 * Returns a new shuffled array to maintain functional purity and prevent side effects.
 * 
 * @template T The type of elements in the array.
 * @param {T[]} array - The source array to be shuffled.
 * @returns {T[]} A new, randomly shuffled array.
 */
export function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Sorts a vocabulary list based on the specified sorting mode.
 * Supports alphabetical ordering, error-rate-based priority (hardest first), or random shuffling.
 * 
 * @template T The type of vocabulary item, extending an object with a word and errorRate.
 * @param {T[]} items - The array of vocabulary items to sort.
 * @param {'random' | 'alphabetical' | 'error_rate'} mode - The sorting strategy to apply.
 * @returns {T[]} A new sorted array based on the selected mode.
 */
export function sortVocabulary<T extends { word: string; errorRate: number }>(
  items: T[],
  mode: 'random' | 'alphabetical' | 'error_rate'
): T[] {
  switch (mode) {
    case 'alphabetical':
      return [...items].sort((a, b) => a.word.localeCompare(b.word));
    case 'error_rate':
      return [...items].sort((a, b) => b.errorRate - a.errorRate);
    case 'random':
    default:
      return shuffleArray(items);
  }
}
