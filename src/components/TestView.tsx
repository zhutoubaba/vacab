import React, { useState, useEffect } from 'react';
import { db, type WordSet } from '../db';
import { useQuiz } from '../hooks/useQuiz';
import { speechService } from '../services/speechService';
import {
  Check, X, RefreshCw, AlertCircle, Award, Trophy, ChevronRight, Volume2
} from 'lucide-react';

interface TestViewProps {
  activeSetId: number | null;
  onSelectSet: (setId: number) => void;
}

/**
 * TestView Component.
 * Integrates dual-mode assessments (Multiple Choice and Spelling check) to reinforce vocabulary retention.
 * Custom hooks handle state coordination while this view implements high-performance slots grid systems,
 * soft keyboards layout focus managers, and standard sensory feedback structures.
 * 
 * @param {TestViewProps} props - The component parameters including activeSetId and navigation callbacks.
 * @returns {React.JSX.Element} The rendered quiz evaluation study view.
 */
export const TestView: React.FC<TestViewProps> = ({ activeSetId, onSelectSet }) => {
  const [sets, setSets] = useState<WordSet[]>([]);
  const [sortBy, setSortBy] = useState<'random' | 'alphabetical' | 'error_rate'>('random');

  const {
    words,
    currentIndex,
    score,
    quizFinished,
    loading,
    testMode,
    setTestMode,
    options,
    selectedOptionIndex,
    isAnswered,
    selectOption,
    typedAnswer,
    setTypedAnswer,
    spellingChecked,
    spellingCorrect,
    triggerSpellingCheck,
    normalizeWord,
    nextQuestion,
    restartQuiz
  } = useQuiz(activeSetId, sortBy);

  // Spelling Interactive Keyboard Focus States
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadSets = async () => {
      const list = await db.wordSets.toArray();
      setSets(list);
    };
    loadSets();
  }, []);

  // Programmatic keyboard focusing logic for seamless mobile UX
  useEffect(() => {
    if (testMode === 'spelling' && !spellingChecked) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [testMode, currentIndex, spellingChecked]);

  /**
   * Invokes Web Speech API vocal pronunciation for a targeted word block at standard audio-pacing (0.85x speed).
   * 
   * @param {string} text - The vocabulary word to speak.
   */
  const speakWord = (text: string) => {
    speechService.speak(text, { rate: 0.85 });
  };

  /**
   * Tracks and handles alphanumeric characters from virtual keyboard inputs, automatically triggering checks once user lengths match.
   * 
   * @param {React.ChangeEvent<HTMLInputElement>} e - React input change event object.
   */
  const handleSpellingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (spellingChecked) return;

    const val = e.target.value;
    setTypedAnswer(val);

    const activeWord = words[currentIndex];
    const normTarget = normalizeWord(activeWord.word);
    const normTyped = normalizeWord(val);

    if (normTyped.length === normTarget.length) {
      triggerSpellingCheck(val);
    }
  };

  /**
   * Evaluates key pressures on text input to enable standard Enter-press submissions and card transitions.
   * 
   * @param {React.KeyboardEvent<HTMLInputElement>} e - React keyboard event object.
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (spellingChecked) {
        nextQuestion();
      } else {
        triggerSpellingCheck(typedAnswer);
      }
    }
  };

  /**
   * Programs and returns structured CSS slots grid items based on letters inside a targeted vocabulary word.
   * 
   * @param {string} targetWord - The target vocabulary word string to be spelled.
   * @param {string} typedText - The user's active keyboard string input.
   * @returns {React.JSX.Element} The programmatically rendered slot box grid wrapper.
   */
  const renderSlots = (targetWord: string, typedText: string) => {
    const userChars = typedText.toLowerCase().replace(/[^a-z0-9]/g, '').split('');
    let userCharIdx = 0;

    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'center', margin: '12px 0' }}>
        {targetWord.split('').map((char, index) => {
          const isLetter = /[a-zA-Z0-9]/.test(char);

          if (!isLetter) {
            return (
              <span key={index} style={{ fontSize: '24px', fontWeight: 700, padding: '0 4px', color: 'var(--text-secondary)' }}>
                {char === ' ' ? '\u00A0\u00A0' : char}
              </span>
            );
          }

          const userChar = userChars[userCharIdx];
          const currentAlphanumericIdx = userCharIdx;
          userCharIdx++;
          const isFilled = userChar !== undefined;

          // An alphanumeric slot is active if focused, not checked, and it is the next slot to fill
          const isActiveSlot = isFocused && !spellingChecked && currentAlphanumericIdx === userChars.length;

          let borderColor = 'var(--border-color)';
          let bgColor = 'var(--bg-input)';
          let textColor = 'var(--text-primary)';

          if (isFilled) {
            borderColor = 'var(--color-primary)';
            bgColor = 'var(--color-primary-soft)';
            textColor = 'var(--color-primary)';
          }

          if (isActiveSlot) {
            borderColor = 'var(--color-primary)';
            bgColor = 'var(--bg-card-solid)';
            textColor = 'var(--color-primary)';
          }

          if (spellingChecked) {
            if (spellingCorrect) {
              borderColor = 'var(--color-success)';
              bgColor = 'var(--color-success-soft)';
              textColor = 'var(--color-success)';
            } else {
              borderColor = 'var(--color-danger)';
              bgColor = 'var(--color-danger-soft)';
              textColor = 'var(--color-danger)';
            }
          }

          return (
            <span
              key={index}
              style={{
                width: '34px',
                height: '42px',
                border: `2px solid ${borderColor}`,
                borderRadius: '10px',
                backgroundColor: bgColor,
                color: textColor,
                fontSize: '18px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textTransform: 'lowercase',
                boxShadow: isActiveSlot ? '0 0 0 3px var(--color-primary-soft)' : (isFilled ? '0 4px 8px rgba(0, 0, 0, 0.04)' : 'none'),
                transition: 'all 0.15s ease',
                position: 'relative'
              }}
            >
              {isFilled ? userChar : ''}
              {isActiveSlot && <span className="spelling-cursor" />}
            </span>
          );
        })}
      </div>
    );
  };

  // --- Render Select Set State ---
  if (!activeSetId) {
    return (
      <div className="view-container">
        <h2>Choose a Word Set for Testing 📝</h2>
        <p style={{ marginBottom: '20px', fontSize: '13px' }}>Select one of your sets to test your vocabulary. We will generate 4-choice Japanese translation quizzes.</p>

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
                  <span className="set-count">Tap to start quiz 🎓</span>
                </div>
                <ChevronRight size={20} style={{ color: 'var(--text-secondary)' }} />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // --- Render Celebration Finished State ---
  if (quizFinished) {
    const accuracy = words.length > 0 ? Math.round((score / words.length) * 100) : 0;
    return (
      <div className="view-container celebration-view">
        <div className="celebration-icon">🎉</div>
        <h2 style={{ fontSize: '24px', fontWeight: 700 }}>Quiz Completed!</h2>

        <div className="glass" style={{ width: '100%', padding: '24px', borderRadius: '24px', marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {accuracy >= 80 ? (
            <Trophy size={48} style={{ color: 'var(--color-warning)', alignSelf: 'center', marginBottom: '8px' }} />
          ) : (
            <Award size={48} style={{ color: 'var(--color-primary)', alignSelf: 'center', marginBottom: '8px' }} />
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px' }}>
            <span>Total Words:</span>
            <strong>{words.length}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px' }}>
            <span>Correct Answers:</span>
            <strong style={{ color: 'var(--color-success)' }}>{score}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px' }}>
            <span>Accuracy Rate:</span>
            <strong style={{ color: accuracy >= 80 ? 'var(--color-success)' : 'var(--color-warning)' }}>
              {accuracy}%
            </strong>
          </div>
        </div>

        <button className="btn btn-primary" style={{ width: '100%', marginTop: '20px', borderRadius: '16px' }} onClick={restartQuiz}>
          <RefreshCw size={16} /> Retake Test
        </button>
        <button className="btn btn-secondary" style={{ width: '100%', borderRadius: '16px' }} onClick={() => onSelectSet(0)}>
          Back to Sets
        </button>
      </div>
    );
  }

  // --- Render Select Test Mode State ---
  if (activeSetId && !testMode) {
    const activeSetName = sets.find(s => s.id === activeSetId)?.name || 'Word Set';
    return (
      <div className="view-container" style={{ padding: '20px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '4px' }}>Test Vocabulary 🎯</h2>
        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
          Set: {activeSetName}
        </span>

        <p style={{ marginTop: '16px', marginBottom: '24px', fontSize: '13px', lineHeight: '1.4' }}>
          Select your challenge type to test your learning:
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            className="glass"
            style={{
              padding: '24px 20px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderRadius: '24px',
              transition: 'all 0.2s ease'
            }}
            onClick={() => setTestMode('choice')}
          >
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '16px',
                backgroundColor: 'var(--color-primary-soft)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-primary)'
              }}>
                <Award size={24} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'left' }}>
                <span style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)' }}>Multiple Choice Quiz</span>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.3' }}>Choose the correct Japanese meaning from 4 options.</span>
              </div>
            </div>
            <ChevronRight size={18} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
          </div>

          <div
            className="glass"
            style={{
              padding: '24px 20px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderRadius: '24px',
              transition: 'all 0.2s ease'
            }}
            onClick={() => setTestMode('spelling')}
          >
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '16px',
                backgroundColor: 'var(--color-secondary-soft)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-secondary)'
              }}>
                <Volume2 size={24} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'left' }}>
                <span style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)' }}>Spelling Test</span>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.3' }}>Listen to pronunciation & Japanese meaning, then type to spell.</span>
              </div>
            </div>
            <ChevronRight size={18} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
          </div>

          <button
            className="btn btn-secondary"
            style={{ width: '100%', marginTop: '16px', padding: '14px', borderRadius: '16px' }}
            onClick={() => onSelectSet(0)}
          >
            Back to Sets
          </button>
        </div>
      </div>
    );
  }

  const activeWord = words[currentIndex];

  return (
    <div className="view-container" style={{ padding: '16px 20px 24px' }}>

      {/* Sorting bar & selectors */}
      <div className="sorting-bar">
        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
          Question {words.length > 0 ? currentIndex + 1 : 0} of {words.length}
        </span>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <select className="sort-select" value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}>
            <option value="random">🔀 Random</option>
            <option value="alphabetical">🔤 A-Z</option>
            <option value="error_rate">📊 Hardest First</option>
          </select>
          <button
            onClick={() => setTestMode(null)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              marginLeft: '8px',
              textDecoration: 'underline'
            }}
          >
            Change Mode
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
          <RefreshCw className="animate-spin" size={32} style={{ color: 'var(--color-primary)' }} />
        </div>
      ) : words.length === 0 ? (
        <div className="glass" style={{ padding: '40px 20px', textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', borderRadius: '24px' }}>
          <AlertCircle size={48} style={{ color: 'var(--text-secondary)', marginBottom: '16px', opacity: 0.5, alignSelf: 'center' }} />
          <p>No testable words in this set.</p>
          <p style={{ fontSize: '12px', marginTop: '4px', lineHeight: '1.4' }}>
            Quizzes require words to have a Japanese translation. Add translations in the <strong>Sets</strong> tab to start!
          </p>
          <button className="btn btn-primary" style={{ marginTop: '16px', padding: '8px 16px', borderRadius: '12px', alignSelf: 'center' }} onClick={() => onSelectSet(0)}>
            Back to Sets
          </button>
        </div>
      ) : testMode === 'choice' ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Question Card */}
          <div className="glass" style={{ width: '100%', padding: '36px 20px', borderRadius: '24px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '8px', background: 'linear-gradient(135deg, var(--bg-card-solid), var(--bg-app))' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '1px' }}>
              Select the correct Japanese meaning
            </span>
            <h1 style={{ fontSize: '42px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-1.5px' }}>
              {activeWord.word}
            </h1>
            {activeWord.phonetic && (
              <span style={{ fontSize: '16px', color: 'var(--color-primary)', fontWeight: 500 }}>
                {activeWord.phonetic}
              </span>
            )}
          </div>

          {/* 4 Choices */}
          <div className="quiz-options">
            {options.map((opt, idx) => {
              let optionClass = '';
              if (isAnswered) {
                if (opt.isCorrect) {
                  optionClass = 'correct';
                } else if (selectedOptionIndex === idx) {
                  optionClass = 'incorrect';
                }
              }

              return (
                <button
                  key={idx}
                  className={`quiz-option ${optionClass}`}
                  onClick={() => selectOption(idx)}
                  disabled={isAnswered}
                >
                  <span>{opt.text}</span>
                  {isAnswered && opt.isCorrect && <Check size={18} style={{ color: 'var(--color-success)' }} />}
                  {isAnswered && !opt.isCorrect && selectedOptionIndex === idx && <X size={18} style={{ color: 'var(--color-danger)' }} />}
                </button>
              );
            })}
          </div>

          {/* Navigation Controls */}
          {isAnswered && (
            <button className="btn btn-primary" style={{ width: '100%', marginTop: 'auto', padding: '14px', borderRadius: '16px' }} onClick={nextQuestion}>
              {currentIndex + 1 >= words.length ? 'Finish Test 🏁' : 'Next Question ➡️'}
            </button>
          )}

        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>

          {/* Compact Redesigned Question Header Card (Mobile-friendly row) */}
          <div className="spelling-question-header">
            <div style={{ textAlign: 'left' }}>
              <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.5px' }}>
                Spell the word that means:
              </span>
              <h2 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px', lineHeight: '1.2' }}>
                {activeWord.definition_ja.trim()}
              </h2>
              {activeWord.phonetic && (
                <span style={{ fontSize: '13px', color: 'var(--color-primary)', fontWeight: 500, display: 'block', marginTop: '2px' }}>
                  {activeWord.phonetic}
                </span>
              )}
            </div>

            <button
              className="btn-icon-only"
              style={{ width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
              onClick={() => speakWord(activeWord.word)}
              title="Speak Word"
            >
              <Volume2 size={18} />
            </button>
          </div>

          {/* Interactive unified Slot Box container */}
          <div
            onClick={() => inputRef.current?.focus()}
            style={{
              position: 'relative',
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              cursor: 'pointer',
              marginTop: '4px'
            }}
          >
            {/* Letters Slot Grid */}
            {renderSlots(activeWord.word, typedAnswer)}

            {/* Invisible Input field laid over slots container */}
            <input
              ref={inputRef}
              type="text"
              value={typedAnswer}
              onChange={handleSpellingChange}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              disabled={spellingChecked}
              maxLength={normalizeWord(activeWord.word).length}
              autoFocus
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck="false"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                opacity: 0,
                cursor: 'pointer',
                fontSize: '16px', // Avoids iOS browser auto-zoom!
                zIndex: 10
              }}
            />

            {/* Tap Guide Hint */}
            {!isFocused && !spellingChecked && (
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px', fontWeight: 500, opacity: 0.8 }}>
                👉 Tap boxes to type spelling
              </span>
            )}
          </div>

          {/* Feedback Section */}
          {spellingChecked && (
            <div
              className="glass"
              style={{
                padding: '12px 16px',
                borderRadius: '16px',
                textAlign: 'center',
                backgroundColor: spellingCorrect ? 'var(--color-success-soft)' : 'var(--color-danger-soft)',
                borderColor: spellingCorrect ? 'var(--color-success)' : 'var(--color-danger)',
                borderWidth: '2px',
                borderStyle: 'solid',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
                marginTop: '4px'
              }}
            >
              {spellingCorrect ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: 'var(--color-success)', fontWeight: 700, fontSize: '15px' }}>
                  <Check size={18} />
                  <span>Correct spelling! 🎉</span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: 'var(--color-danger)', fontWeight: 700, fontSize: '15px' }}>
                    <X size={18} />
                    <span>Incorrect spelling!</span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Your answer: <span style={{ textDecoration: 'line-through' }}>{typedAnswer || "(empty)"}</span>
                  </div>
                  <div style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: 600 }}>
                    Correct: <span style={{ color: 'var(--color-success)', fontWeight: 700 }}>{activeWord.word}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Navigation Controls */}
          {spellingChecked && (
            <button
              className="btn btn-primary"
              style={{ width: '100%', padding: '12px', borderRadius: '14px', marginTop: '8px' }}
              onClick={nextQuestion}
            >
              {currentIndex + 1 >= words.length ? 'Finish Test 🏁' : 'Next Question ➡️'}
            </button>
          )}

        </div>
      )}

    </div>
  );
};
