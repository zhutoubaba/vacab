import React, { useState, useEffect } from 'react';
import { db, type WordSet } from '../db';
import { statsService, type WordWithStats } from '../services/statsService';
import { speechService } from '../services/speechService';
import { sortVocabulary } from '../utils/arrayUtils';
import {
  Volume2, ChevronLeft, ChevronRight, Play, X,
  BookOpen, AlertCircle, RefreshCw
} from 'lucide-react';

interface LearnViewProps {
  activeSetId: number | null;
  onSelectSet: (setId: number) => void;
}

/**
 * LearnView Component.
 * Implements a 3D flipping flashcard memory deck with dynamic card sorting (random, A-Z, error priority),
 * Web Speech audio TTS playback, touch swipes for rapid logs telemetry, and embedded YouGlish widgets for contextual video learning.
 * 
 * @param {LearnViewProps} props - The component parameters including activeSetId and navigation callbacks.
 * @returns {React.JSX.Element} The rendered learning interface study view.
 */
export const LearnView: React.FC<LearnViewProps> = ({ activeSetId, onSelectSet }) => {
  const [sets, setSets] = useState<WordSet[]>([]);
  const [words, setWords] = useState<WordWithStats[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [sortBy, setSortBy] = useState<'random' | 'alphabetical' | 'error_rate'>('random');
  const [loading, setLoading] = useState(false);

  // YouGlish Bottom Sheet States
  const [isYouGlishOpen, setIsYouGlishOpen] = useState(false);
  const [isYouGlishReady, setIsYouGlishReady] = useState(false);
  const [youGlishError, setYouGlishError] = useState<string | null>(null);

  // Native touch gesture states
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [touchOffset, setTouchOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isSwiping, setIsSwiping] = useState(false);

  useEffect(() => {
    loadSets();
  }, []);

  useEffect(() => {
    if (activeSetId) {
      loadWords(activeSetId, sortBy);
    } else {
      setWords([]);
      setCurrentIndex(0);
      setIsFlipped(false);
    }
  }, [activeSetId, sortBy]);

  /**
   * Retrieves all available word sets from the database to present selector cards if no active set is loaded.
   */
  const loadSets = async () => {
    const list = await db.wordSets.toArray();
    setSets(list);
  };

  /**
   * Loads enriched words for a chosen set and applies standard card-sorting strategies (Fisher-Yates shuffle, alphabetize, error rate).
   * 
   * @param {number} setId - The target word set ID.
   * @param {'random' | 'alphabetical' | 'error_rate'} sortMode - The card sorting algorithm.
   */
  const loadWords = async (setId: number, sortMode: typeof sortBy) => {
    setLoading(true);
    try {
      const enriched = await statsService.getWordsWithStats(setId);
      const sortedList = sortVocabulary(enriched, sortMode);
      setWords(sortedList);
      setCurrentIndex(0);
      setIsFlipped(false);
    } catch (err) {
      console.error('Failed to load words for set:', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Flips the active flashcard to reveal definitions, automatically registering a view log database event on front-to-back flip.
   */
  const handleFlip = async () => {
    if (isSwiping || Math.abs(touchOffset.x) > 10) return;

    const newFlipState = !isFlipped;
    setIsFlipped(newFlipState);

    if (newFlipState && words.length > 0) {
      const activeWord = words[currentIndex];
      await db.viewLogs.add({
        word_id: activeWord.id!,
        viewed_at: new Date()
      });
    }
  };

  /**
   * Sets up baseline touch coordinate systems on initial user touch inputs.
   * 
   * @param {React.TouchEvent} e - React touch event object.
   */
  const handleTouchStart = (e: React.TouchEvent) => {
    if (words.length === 0) return;
    const touch = e.touches[0];
    setTouchStart({ x: touch.clientX, y: touch.clientY });
    setIsSwiping(false);
  };

  /**
   * Tracks real-time drag movements to adjust relative offset coordinates of swiping elements.
   * 
   * @param {React.TouchEvent} e - React touch event object.
   */
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStart) return;
    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStart.x;

    if (Math.abs(deltaX) > 10) {
      setIsSwiping(true);
      if (e.cancelable) e.preventDefault();
    }

    setTouchOffset({ x: deltaX, y: touch.clientY - touchStart.y });
  };

  /**
   * Evaluates swipe offsets on finger release, triggering dynamic card shifts, test database updates (swipe easy/hard), or animations.
   */
  const handleTouchEnd = async () => {
    if (!touchStart) return;

    const threshold = 100;
    const deltaX = touchOffset.x;

    if (isSwiping && Math.abs(deltaX) > threshold) {
      const direction = deltaX > 0 ? 'right' : 'left';
      setTouchOffset({ x: direction === 'right' ? 500 : -500, y: 0 });

      setTimeout(async () => {
        const activeWord = words[currentIndex];
        const isCorrect = direction === 'right';

        await db.testLogs.add({
          word_id: activeWord.id!,
          is_correct: isCorrect,
          selected_option: isCorrect ? 'SWIPE_CORRECT' : 'SWIPE_INCORRECT',
          tested_at: new Date()
        });

        setTouchOffset({ x: 0, y: 0 });
        setTouchStart(null);
        setIsSwiping(false);
        setIsFlipped(false);
        setCurrentIndex((prev) => (prev + 1) % words.length);
      }, 200);
    } else {
      setTouchOffset({ x: 0, y: 0 });
      setTouchStart(null);
      setIsSwiping(false);
    }
  };

  /**
   * Slides the study deck forward to display the next flashcard.
   */
  const handleNext = () => {
    if (words.length === 0) return;
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % words.length);
    }, 150);
  };

  /**
   * Slides the study deck backward to display the previous flashcard.
   */
  const handlePrev = () => {
    if (words.length === 0) return;
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev - 1 + words.length) % words.length);
    }, 150);
  };

  /**
   * Invokes standard Web Speech API vocal pronunciation for a targeted string block.
   * 
   * @param {React.MouseEvent} e - Mouse event triggers.
   * @param {string} text - The words or sentences to be spoken.
   */
  const handleSpeak = (e: React.MouseEvent, text: string) => {
    e.stopPropagation();
    speechService.speak(text, { rate: 1.0 });
  };

  /**
   * Injects the YouGlish API widget helper script to the document body if missing,
   * resolving once the external library has successfully loaded.
   * 
   * @returns {Promise<void>}
   */
  const ensureYouGlishScript = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      // Already loaded
      if ((window as any).YG) {
        resolve();
        return;
      }

      // Set up the global ready callback that widget.js calls when loaded
      const prevCallback = (window as any).onYouglishAPIReady;
      (window as any).onYouglishAPIReady = () => {
        if (prevCallback) prevCallback();
        resolve();
      };

      // Only inject script once
      if (document.querySelector('script[src*="youglish.com/public/emb/widget.js"]')) {
        // Script already injected, might still be loading — wait for callback
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://youglish.com/public/emb/widget.js';
      script.async = true;
      script.charset = 'utf-8';
      script.onerror = () => reject(new Error('Failed to load YouGlish script'));
      document.body.appendChild(script);
    });
  };

  /**
   * Dynamically constructs official anchor parameters to mount and hydrate the YouGlish iframe inside host elements.
   * 
   * @param {string} word - The vocabulary string to be queried.
   */
  const injectYouGlishWidget = (word: string) => {
    const host = document.getElementById('yg-widget-host');
    if (!host) return;

    // Clear previous widget
    host.innerHTML = '';

    // Create the anchor element exactly as the official embed docs specify
    const anchor = document.createElement('a');
    anchor.id = 'yg-widget-0';
    anchor.className = 'youglish-widget';
    anchor.setAttribute('data-query', encodeURIComponent(word));
    anchor.setAttribute('data-lang', 'english');
    anchor.setAttribute('data-components', '94');
    anchor.setAttribute('data-bkg-color', 'theme_light');
    anchor.setAttribute('data-height', '780');
    anchor.setAttribute('rel', 'nofollow');
    anchor.href = 'https://youglish.com';
    anchor.textContent = 'Visit YouGlish.com';
    host.appendChild(anchor);

    // YG.parsePage() scans the DOM for .youglish-widget anchors and hydrates them
    if ((window as any).YG && typeof (window as any).YG.parsePage === 'function') {
      try {
        (window as any).YG.parsePage();
        setIsYouGlishReady(true);
        setYouGlishError(null);
      } catch (err) {
        console.error('YG.parsePage error:', err);
        setYouGlishError('Failed to initialize YouGlish player.');
      }
    }
  };

  /**
   * Opens the YouGlish bottom sheet drawer and initializes widget loaders for standard contextual videos.
   * 
   * @param {React.MouseEvent} e - Mouse event triggers.
   */
  const handleOpenYouGlish = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const word = words[currentIndex]?.word;
    if (!word) return;

    setIsYouGlishOpen(true);
    setIsYouGlishReady(false);
    setYouGlishError(null);

    try {
      await ensureYouGlishScript();
      // Wait a tick so the bottom sheet + host div is in the DOM
      setTimeout(() => injectYouGlishWidget(word), 100);
    } catch (err) {
      console.error('YouGlish script load error:', err);
      setYouGlishError('Could not load YouGlish. Please check your internet connection.');
    }
  };

  /**
   * Closes the bottom sheet drawer and purges iframe contexts to release active system memory structures.
   */
  const handleCloseYouGlish = () => {
    setIsYouGlishOpen(false);
    setIsYouGlishReady(false);
    // Clean up so next open starts fresh with the new word
    const host = document.getElementById('yg-widget-host');
    if (host) host.innerHTML = '';
  };

  // --- Render: No set selected ---
  if (!activeSetId) {
    return (
      <div className="view-container">
        <h2>Choose a Word Set 🎴</h2>
        <p style={{ marginBottom: '20px', fontSize: '13px' }}>Select one of your vocabulary sets to study with interactive flashcards.</p>

        {sets.length === 0 ? (
          <div className="glass" style={{ padding: '40px 20px', textAlign: 'center', borderRadius: '24px' }}>
            <AlertCircle size={48} style={{ color: 'var(--text-secondary)', marginBottom: '16px', opacity: 0.5 }} />
            <p>No word sets found.</p>
            <p style={{ fontSize: '13px', marginTop: '4px' }}>Go to the <strong>Sets</strong> tab to add a word set first!</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {sets.map(s => (
              <div key={s.id} className="glass set-card" onClick={() => onSelectSet(s.id!)}>
                <div className="set-info">
                  <span className="set-name">{s.name}</span>
                  <span className="set-count">Tap to start studying 🚀</span>
                </div>
                <ChevronRight size={20} style={{ color: 'var(--text-secondary)' }} />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  const activeWord = words[currentIndex];

  return (
    <div className="view-container" style={{ padding: '16px 20px 24px' }}>

      {/* Sorting bar & selectors */}
      <div className="sorting-bar">
        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
          Card {words.length > 0 ? currentIndex + 1 : 0} of {words.length}
        </span>
        <select className="sort-select" value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}>
          <option value="random">🔀 Random</option>
          <option value="alphabetical">🔤 A-Z</option>
          <option value="error_rate">📊 Hardest First</option>
        </select>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
          <RefreshCw className="animate-spin" size={32} style={{ color: 'var(--color-primary)' }} />
        </div>
      ) : words.length === 0 ? (
        <div className="glass" style={{ padding: '40px 20px', textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', borderRadius: '24px' }}>
          <BookOpen size={48} style={{ color: 'var(--text-secondary)', marginBottom: '16px', opacity: 0.5, alignSelf: 'center' }} />
          <p>No words in this set.</p>
          <p style={{ fontSize: '12px', marginTop: '4px' }}>Go to the <strong>Sets</strong> tab to add words to this set!</p>
          <button className="btn btn-primary" style={{ marginTop: '16px', padding: '8px 16px', borderRadius: '12px', alignSelf: 'center' }} onClick={() => onSelectSet(0)}>
            Back to Sets
          </button>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>

          {/* 3D Flipping Card */}
          <div
            className="flashcard-container"
            onClick={handleFlip}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            style={{ touchAction: 'pan-y' }}
          >
            <div
              className={`flashcard ${isFlipped ? 'flipped' : ''}`}
              style={{
                transform: `${isFlipped ? 'rotateY(180deg)' : ''} translate3d(${touchOffset.x}px, 0, 0) rotate(${touchOffset.x * 0.05}deg)`,
                transition: touchOffset.x === 0
                  ? 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
                  : 'none'
              }}
            >

              {/* Touch Swipe Feedback Overlay */}
              {touchOffset.x !== 0 && (
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    borderRadius: 'var(--border-radius-lg)',
                    backgroundColor: touchOffset.x > 0
                      ? 'rgba(14, 165, 233, 0.08)'
                      : 'rgba(239, 68, 68, 0.08)',
                    border: `2px solid ${touchOffset.x > 0 ? 'var(--color-primary)' : 'var(--color-danger)'}`,
                    pointerEvents: 'none',
                    zIndex: 10,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '24px',
                    color: touchOffset.x > 0 ? 'var(--color-primary)' : 'var(--color-danger)',
                    transform: isFlipped ? 'rotateY(180deg)' : 'none'
                  }}
                >
                  {touchOffset.x > 40 ? 'Easy! 👍' : touchOffset.x < -40 ? 'Hard! 👎' : ''}
                </div>
              )}

              {/* CARD FRONT */}
              <div className="flashcard-front">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h1 className="card-word">{activeWord.word}</h1>
                    <span className="card-phonetic">{activeWord.phonetic}</span>
                  </div>
                  <button className="btn-icon-only" style={{ width: '42px', height: '42px' }} onClick={(e) => handleSpeak(e, activeWord.word)}>
                    <Volume2 size={18} />
                  </button>
                </div>

                <div className="card-sentences">
                  <div className="card-sentence-title">Example Sentences 🔊</div>
                  {activeWord.sentences && activeWord.sentences.length > 0 ? (
                    activeWord.sentences.map((s, idx) => (
                      <div key={idx} className="card-sentence" style={{ cursor: 'pointer' }} onClick={(e) => handleSpeak(e, s)}>
                        {idx + 1}. {s}
                      </div>
                    ))
                  ) : (
                    <div style={{ fontStyle: 'italic', fontSize: '13px', color: 'var(--text-secondary)' }}>
                      No sentences available. Tap edit in Sets to add some!
                    </div>
                  )}
                </div>
              </div>

              {/* CARD BACK */}
              <div className="flashcard-back">
                <div className="card-definitions">
                  <div className="def-section">
                    <div className="def-label">English Meaning</div>
                    <div className="def-content">{activeWord.definition_en || 'NA'}</div>
                  </div>

                  <div className="def-section japanese">
                    <div className="def-label">Japanese Meaning</div>
                    <div className="def-content">{activeWord.definition_ja || 'NA'}</div>
                  </div>
                </div>

                {/* YouGlish integration button */}
                <button
                  className="btn btn-outline"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', fontSize: '14px', marginTop: '20px' }}
                  onClick={handleOpenYouGlish}
                >
                  <Play size={14} fill="currentColor" /> Pronounce with YouGlish
                </button>
              </div>

            </div>
          </div>

          {/* Navigation Controls */}
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
            <button className="btn btn-secondary" style={{ flex: 1, borderRadius: '16px' }} onClick={handlePrev}>
              <ChevronLeft size={18} /> Previous
            </button>
            <button className="btn btn-primary" style={{ flex: 1, borderRadius: '16px' }} onClick={handleNext}>
              Next <ChevronRight size={18} />
            </button>
          </div>

        </div>
      )}

      {/* YouGlish Bottom Sheet Overlay */}
      <div className={`bottom-sheet-backdrop ${isYouGlishOpen ? 'active' : ''}`} onClick={handleCloseYouGlish} />
      <div className={`bottom-sheet ${isYouGlishOpen ? 'active' : ''}`}>
        <div className="bottom-sheet-handle" />
        <div className="bottom-sheet-header">
          <span style={{ fontWeight: 700, fontSize: '16px' }}>Pronunciation: "{activeWord?.word}"</span>
          <button className="btn-icon-only" style={{ width: '32px', height: '32px' }} onClick={handleCloseYouGlish}>
            <X size={14} />
          </button>
        </div>
        <div className="bottom-sheet-content">
          <div className="youglish-wrapper">
            {youGlishError ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '20px', textAlign: 'center' }}>
                <AlertCircle size={24} style={{ color: 'var(--color-danger)' }} />
                <span style={{ fontSize: '13px', color: 'var(--color-danger)', fontWeight: 600 }}>{youGlishError}</span>
              </div>
            ) : !isYouGlishReady ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '20px' }}>
                <RefreshCw className="animate-spin" size={24} style={{ color: 'var(--color-primary)' }} />
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Loading YouGlish...</span>
              </div>
            ) : null}
            {/* YouGlish injects the video player here via YG.parsePage() */}
            <div
              id="yg-widget-host"
              style={{
                width: '100%',
                minHeight: isYouGlishReady && !youGlishError ? '680px' : '0px',
                display: isYouGlishReady && !youGlishError ? 'block' : 'none'
              }}
            />
          </div>
        </div>
      </div>

    </div>
  );
};
