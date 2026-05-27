import { useState, useEffect, useCallback } from 'react';
import { db, type Word } from '../db';
import { statsService, type WordWithStats } from '../services/statsService';
import { shuffleArray, sortVocabulary } from '../utils/arrayUtils';

export interface QuizOption {
  text: string;
  isCorrect: boolean;
}

/**
 * Custom React hook that encapsulates the state machine logic for both 
 * Multiple Choice and Spelling quizzes. Handles data fetching, distractor options 
 * calculation, score telemetry, and persistence to IndexedDB.
 * 
 * @param {number | null} activeSetId - The ID of the word set to query.
 * @param {'random' | 'alphabetical' | 'error_rate'} sortBy - The strategy used to sort vocabulary before testing.
 */
export function useQuiz(
  activeSetId: number | null,
  sortBy: 'random' | 'alphabetical' | 'error_rate'
) {
  const [words, setWords] = useState<WordWithStats[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);
  const [loading, setLoading] = useState(false);

  // Challenge Mode State
  const [testMode, setTestMode] = useState<'choice' | 'spelling' | null>(null);

  // Multiple Choice States
  const [options, setOptions] = useState<QuizOption[]>([]);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);

  // Spelling States
  const [typedAnswer, setTypedAnswer] = useState('');
  const [spellingChecked, setSpellingChecked] = useState(false);
  const [spellingCorrect, setSpellingCorrect] = useState(false);

  // 1. Fetch & Sort words from statsService (Batch loaded!)
  const loadQuizWords = useCallback(async () => {
    if (!activeSetId) {
      setWords([]);
      setCurrentIndex(0);
      setQuizFinished(false);
      return;
    }

    setLoading(true);
    try {
      const enriched = await statsService.getWordsWithStats(activeSetId);
      // Only quiz words that have a Japanese translation to avoid meaningless tests
      const testableWords = enriched.filter(w => w.definition_ja && w.definition_ja.trim() !== '');
      const sorted = sortVocabulary(testableWords, sortBy);

      setWords(sorted);
      setCurrentIndex(0);
      setScore(0);
      setQuizFinished(false);
      setSelectedOptionIndex(null);
      setIsAnswered(false);
      setTypedAnswer('');
      setSpellingChecked(false);
      setSpellingCorrect(false);
    } catch (err) {
      console.error('Failed to load quiz words:', err);
    } finally {
      setLoading(false);
    }
  }, [activeSetId, sortBy]);

  // Load words when active set or sorting modes change
  useEffect(() => {
    loadQuizWords();
    setTestMode(null);
  }, [activeSetId, sortBy, loadQuizWords]);

  // 2. Distractor option generator for Multiple Choice
  const generateQuizOptions = useCallback(async () => {
    if (words.length === 0 || currentIndex >= words.length) return;

    const activeWord = words[currentIndex];
    const correctText = activeWord.definition_ja.trim();

    try {
      const currentSetWords = await db.words.where('set_id').equals(activeSetId!).toArray();
      let currentSetDefs = currentSetWords
        .map(w => w.definition_ja.trim())
        .filter(d => d && d !== correctText);

      // Unique distractors
      currentSetDefs = Array.from(new Set(currentSetDefs));

      const distractors: string[] = [];
      while (distractors.length < 3 && currentSetDefs.length > 0) {
        const idx = Math.floor(Math.random() * currentSetDefs.length);
        distractors.push(currentSetDefs[idx]);
        currentSetDefs.splice(idx, 1);
      }

      const assembled = shuffleArray([
        { text: correctText, isCorrect: true },
        ...distractors.map(d => ({ text: d, isCorrect: false }))
      ]);

      setOptions(assembled);
      setSelectedOptionIndex(null);
      setIsAnswered(false);
    } catch (err) {
      console.error('Failed to generate options:', err);
    }
  }, [words, currentIndex, activeSetId]);

  // Generate options when current index or mode shifts
  useEffect(() => {
    if (words.length > 0 && !quizFinished && testMode === 'choice') {
      generateQuizOptions();
    }
  }, [words, currentIndex, quizFinished, testMode, generateQuizOptions]);

  // 3. Choice grading behavior
  const selectOption = useCallback(async (optionIdx: number) => {
    if (isAnswered || words.length === 0) return;

    setSelectedOptionIndex(optionIdx);
    setIsAnswered(true);

    const chosenOption = options[optionIdx];
    const isCorrect = chosenOption.isCorrect;

    if (isCorrect) {
      setScore(prev => prev + 1);
    }

    // Write a test log to database
    const activeWord = words[currentIndex];
    try {
      await db.testLogs.add({
        word_id: activeWord.id!,
        is_correct: isCorrect,
        selected_option: chosenOption.text,
        tested_at: new Date()
      });
    } catch (err) {
      console.error('Failed to record test log:', err);
    }
  }, [isAnswered, words, currentIndex, options]);

  // 4. Spelling grading behavior
  const normalizeWord = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '');

  const triggerSpellingCheck = useCallback(async (typed: string) => {
    if (spellingChecked || words.length === 0) return;

    const activeWord = words[currentIndex];
    const normalizedTarget = normalizeWord(activeWord.word);
    const normalizedTyped = normalizeWord(typed);
    const isCorrect = normalizedTyped === normalizedTarget;

    setSpellingChecked(true);
    setSpellingCorrect(isCorrect);

    if (isCorrect) {
      setScore(prev => prev + 1);
    }

    // Write a test log to database
    try {
      await db.testLogs.add({
        word_id: activeWord.id!,
        is_correct: isCorrect,
        selected_option: typed.trim(),
        tested_at: new Date()
      });
    } catch (err) {
      console.error('Failed to record spelling test log:', err);
    }
  }, [spellingChecked, words, currentIndex]);

  // 5. Navigation behaviors
  const nextQuestion = useCallback(() => {
    if (currentIndex + 1 >= words.length) {
      setQuizFinished(true);
    } else {
      setCurrentIndex(prev => prev + 1);
      // Reset modes
      setTypedAnswer('');
      setSpellingChecked(false);
      setSpellingCorrect(false);
      setIsAnswered(false);
      setSelectedOptionIndex(null);
    }
  }, [currentIndex, words.length]);

  const restartQuiz = useCallback(() => {
    loadQuizWords();
  }, [loadQuizWords]);

  return {
    words,
    currentIndex,
    score,
    quizFinished,
    loading,
    
    // Modes
    testMode,
    setTestMode,
    
    // Multiple Choice
    options,
    selectedOptionIndex,
    isAnswered,
    selectOption,
    
    // Spelling
    typedAnswer,
    setTypedAnswer,
    spellingChecked,
    spellingCorrect,
    triggerSpellingCheck,
    normalizeWord,
    
    // Actions
    nextQuestion,
    restartQuiz
  };
}
