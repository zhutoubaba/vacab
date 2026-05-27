export interface FetchedMetadata {
  phonetic: string;
  definition_en: string;
  definition_ja: string;
  sentences: string[];
}

/**
 * Sanitizes text returned from dynamic translation APIs by removing any 
 * embedded HTML tags and trimming excess white spaces.
 * 
 * @param {string} text - The raw text to sanitize.
 * @returns {string} The cleaned, plain text string.
 */
function cleanText(text: string): string {
  if (!text) return '';
  return text.replace(/<\/?[^>]+(>|$)/g, "").trim();
}

/**
 * Fetches English definitions, phonetics, and usage sentences for a target word from DictionaryAPI.
 * Filters out sentences that are too long to ensure suitability for primary learners (3-12 words).
 * 
 * @param {string} word - The English vocabulary word to look up.
 * @returns {Promise<{ phonetic: string; definition_en: string; sentences: string[] } | null>} 
 *          A promise resolving to the metadata dictionary details, or null if look-up fails.
 */
async function fetchDictionaryData(word: string) {
  try {
    const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word.toLowerCase().trim())}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;

    const entry = data[0];

    // Step 1: Extract Phonetics (check main field, fallback to scanning secondary phonetics arrays)
    let phonetic = entry.phonetic || '';
    if (!phonetic && Array.isArray(entry.phonetics)) {
      phonetic = entry.phonetics.find((p: any) => p.text)?.text || '';
    }

    // Step 2: Extract English definition (retrieve first definition text under meanings array)
    let definition_en = '';
    const meanings = entry.meanings || [];
    if (meanings.length > 0) {
      definition_en = meanings[0].definitions?.[0]?.definition || '';
    }

    // Step 3: Extract sentences (filter out sentences that are too long or complex for primary beginners)
    const sentences: string[] = [];
    for (const meaning of meanings) {
      const definitions = meaning.definitions || [];
      for (const def of definitions) {
        if (def.example) {
          const cleanEx = def.example.trim();
          // Filter Criteria: Sentence must contain between 3 and 12 words to reduce cognitive load
          const wordCount = cleanEx.split(/\s+/).length;
          if (wordCount >= 3 && wordCount <= 12 && !sentences.includes(cleanEx)) {
            sentences.push(cleanEx);
          }
        }
        if (sentences.length >= 3) break;
      }
      if (sentences.length >= 3) break;
    }

    return { phonetic, definition_en, sentences };
  } catch (error) {
    console.error('Error fetching from DictionaryAPI:', error);
    return null;
  }
}

/**
 * Translates a text block from English to Japanese using the MyMemory API,
 * subsequently cleaning up HTML responses.
 * 
 * @param {string} text - The English phrase or word to translate.
 * @returns {Promise<string>} A promise resolving to the Japanese translation.
 */
async function fetchJapaneseTranslation(text: string): Promise<string> {
  if (!text) return '';
  try {
    const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text.trim())}&langpair=en|ja`);
    if (!res.ok) return '';
    const data = await res.json();
    return cleanText(data?.responseData?.translatedText || '');
  } catch (error) {
    console.error('Error fetching translation from MyMemory:', error);
    return '';
  }
}

/**
 * Orchestrates parallel and cascade fetching of definitions, phonetic spellings, 
 * translations, and beginner-friendly examples for a specific vocabulary word.
 * 
 * @param {string} word - The English word to retrieve metadata for.
 * @returns {Promise<FetchedMetadata>} A promise resolving to standard FetchedMetadata.
 */
export async function fetchWordMetadata(word: string): Promise<FetchedMetadata> {
  const result: FetchedMetadata = {
    phonetic: '',
    definition_en: '',
    definition_ja: '',
    sentences: []
  };

  const trimmedWord = word.trim();
  if (!trimmedWord) return result;

  // Step 1: Query the English Dictionary API to parse phonetic symbols and basic definitions
  const dictData = await fetchDictionaryData(trimmedWord);

  if (dictData) {
    result.phonetic = dictData.phonetic;
    result.definition_en = dictData.definition_en;
    result.sentences = dictData.sentences;
  }

  // Step 2: Query MyMemory API to retrieve the Japanese translation definition
  result.definition_ja = await fetchJapaneseTranslation(trimmedWord);

  return result;
}
