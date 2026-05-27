import React, { useState, useEffect } from 'react';
import { db, type WordSet, type Word, syncSeedsToDatabase, type SyncReport } from '../db';
import { fetchWordMetadata } from '../syncService';
import { csvService } from '../services/csvService';
import {
  Plus, Trash2, Edit, ChevronRight, Download, Upload,
  RefreshCw, X, FileText, Check, AlertCircle, ArrowLeft
} from 'lucide-react';

interface SetCardRowProps {
  setObj: WordSet;
  onSelectSet: (setId: number) => void;
  onEditSet: (setId: number, name: string) => void;
  onExportSet: (setId: number, name: string, e: React.MouseEvent) => void;
  onDeleteSet: (setId: number, e: React.MouseEvent) => void;
}

/**
 * SetCardRow Sub-component.
 * Renders an individual vocabulary set row displaying metadata counts (word counts)
 * and interactive action buttons for editing, exporting, and deleting.
 * 
 * @param {SetCardRowProps} props - The sub-component properties.
 * @returns {React.JSX.Element} The rendered set card item row.
 */
const SetCardRow: React.FC<SetCardRowProps> = ({ setObj, onSelectSet, onEditSet, onExportSet, onDeleteSet }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (setObj.id) {
      db.words.where('set_id').equals(setObj.id).count().then(setCount);
    }
  }, [setObj.id]);

  return (
    <div className="glass set-card" onClick={() => onSelectSet(setObj.id!)}>
      <div className="set-info">
        <span className="set-name">{setObj.name}</span>
        <span className="set-count">{count} {count === 1 ? 'word' : 'words'}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button className="btn-icon-only" style={{ width: '32px', height: '32px' }} onClick={(e) => { e.stopPropagation(); onEditSet(setObj.id!, setObj.name); }}>
          <Edit size={14} />
        </button>
        <button className="btn-icon-only" style={{ width: '32px', height: '32px', color: 'var(--color-primary)' }} onClick={(e) => onExportSet(setObj.id!, setObj.name, e)}>
          <Download size={14} />
        </button>
        <button className="btn-icon-only" style={{ width: '32px', height: '32px', color: 'var(--color-danger)' }} onClick={(e) => onDeleteSet(setObj.id!, e)}>
          <Trash2 size={14} />
        </button>
        <ChevronRight size={20} style={{ color: 'var(--text-secondary)', marginLeft: '4px' }} />
      </div>
    </div>
  );
};


interface SetsViewProps {
  onSelectSet: (setId: number) => void;
  activeSetId: number | null;
}

/**
 * SetsView Component.
 * Implements the core vocabulary management panel. Handles set-level and word-level CRUD operations,
 * seed database synchronization triggers, bulk online API metadata lookup (sync services),
 * drag-and-drop CSV imports, and browser CSV download exports.
 * 
 * @param {SetsViewProps} props - The component parameters including activeSetId and navigation callbacks.
 * @returns {React.JSX.Element} The rendered sets management view.
 */
export const SetsView: React.FC<SetsViewProps> = ({ onSelectSet, activeSetId }) => {
  const [sets, setSets] = useState<WordSet[]>([]);
  const [activeSet, setActiveSet] = useState<WordSet | null>(null);
  const [words, setWords] = useState<Word[]>([]);

  // Modals & Forms States
  const [isSetModalOpen, setIsSetModalOpen] = useState(false);
  const [setFormName, setSetFormName] = useState('');
  const [editingSetId, setEditingSetId] = useState<number | null>(null);

  const [isWordModalOpen, setIsWordModalOpen] = useState(false);
  const [editingWordId, setEditingWordId] = useState<number | null>(null);
  const [wordForm, setWordForm] = useState({
    word: '',
    phonetic: '',
    definition_en: '',
    definition_ja: '',
    sentence1: '',
    sentence2: '',
    sentence3: ''
  });

  // CSV Import States
  const [isDragOver, setIsDragOver] = useState(false);
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error' | null, message: string }>({ type: null, message: '' });

  // Bulk Sync Progress
  const [syncProgress, setSyncProgress] = useState<{ active: boolean, current: number, total: number }>({ active: false, current: 0, total: 0 });

  // Seed Sync & Persist States
  const [syncReport, setSyncReport] = useState<SyncReport | null>(null);
  const [isSyncReportModalOpen, setIsSyncReportModalOpen] = useState(false);
  const [isSyncingSeeds, setIsSyncingSeeds] = useState(false);
  const [isSavingSeed, setIsSavingSeed] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error' | null, message: string }>({ type: null, message: '' });
  const [isServerActive, setIsServerActive] = useState<boolean>(false);

  useEffect(() => {
    loadSets();

    // Non-blocking local server presence check (600ms AbortController timeout)
    const checkServer = async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 600);
      try {
        const res = await fetch('/api/health', { signal: controller.signal });
        if (res.ok) {
          const data = await res.json();
          if (data && data.success) {
            setIsServerActive(true);
          }
        }
      } catch (err) {
        // Fallback to standalone mode silently
        setIsServerActive(false);
      } finally {
        clearTimeout(timeoutId);
      }
    };
    checkServer();
  }, []);

  useEffect(() => {
    if (activeSetId) {
      loadActiveSet(activeSetId);
    } else {
      setActiveSet(null);
      setWords([]);
    }
  }, [activeSetId]);

  const loadSets = async () => {
    const list = await db.wordSets.orderBy('created_at').toArray();
    setSets(list);
  };

  const loadActiveSet = async (setId: number) => {
    const set = await db.wordSets.get(setId);
    if (set) {
      setActiveSet(set);
      const list = await db.words.where('set_id').equals(setId).toArray();
      setWords(list);
    }
  };

  // --- Word Set CRUD ---
  const handleSaveSet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!setFormName.trim()) return;

    if (editingSetId) {
      // Update
      await db.wordSets.update(editingSetId, { name: setFormName.trim() });
    } else {
      // Create
      await db.wordSets.add({
        name: setFormName.trim(),
        created_at: new Date()
      });
    }

    setSetFormName('');
    setEditingSetId(null);
    setIsSetModalOpen(false);
    loadSets();
    if (activeSetId) {
      loadActiveSet(activeSetId);
    }
  };

  const handleDeleteSet = async (setId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this word set? All words and learning statistics inside will be permanently deleted.')) return;

    await db.transaction('rw', [db.wordSets, db.words, db.viewLogs, db.testLogs], async () => {
      // Get all words in the set
      const wordsInSet = await db.words.where('set_id').equals(setId).toArray();
      const wordIds = wordsInSet.map(w => w.id!).filter(id => id !== undefined);

      if (wordIds.length > 0) {
        // Delete view and test logs for these words
        await db.viewLogs.where('word_id').anyOf(wordIds).delete();
        await db.testLogs.where('word_id').anyOf(wordIds).delete();
        // Delete the words
        await db.words.where('set_id').equals(setId).delete();
      }

      // Delete the set
      await db.wordSets.delete(setId);
    });

    if (activeSetId === setId) {
      onSelectSet(0);
    }
    loadSets();
  };

  // --- Word CRUD ---
  const handleOpenWordModal = (wordObj?: Word) => {
    if (wordObj) {
      setEditingWordId(wordObj.id || null);
      setWordForm({
        word: wordObj.word,
        phonetic: wordObj.phonetic || '',
        definition_en: wordObj.definition_en || '',
        definition_ja: wordObj.definition_ja || '',
        sentence1: wordObj.sentences?.[0] || '',
        sentence2: wordObj.sentences?.[1] || '',
        sentence3: wordObj.sentences?.[2] || ''
      });
    } else {
      setEditingWordId(null);
      setWordForm({
        word: '',
        phonetic: '',
        definition_en: '',
        definition_ja: '',
        sentence1: '',
        sentence2: '',
        sentence3: ''
      });
    }
    setIsWordModalOpen(true);
  };

  const handleSaveWord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wordForm.word.trim() || !activeSetId) return;

    const sentences = [wordForm.sentence1, wordForm.sentence2, wordForm.sentence3]
      .map(s => s.trim())
      .filter(s => s !== '');

    const wordData: Omit<Word, 'id'> = {
      set_id: activeSetId,
      word: wordForm.word.trim(),
      phonetic: wordForm.phonetic.trim(),
      definition_en: wordForm.definition_en.trim(),
      definition_ja: wordForm.definition_ja.trim(),
      sentences,
      created_at: new Date()
    };

    let wordId = editingWordId;

    if (editingWordId) {
      await db.words.update(editingWordId, wordData);
    } else {
      wordId = await db.words.add(wordData);
    }

    setIsWordModalOpen(false);
    loadActiveSet(activeSetId);

    // Auto-fetch if the added/edited word details are completely empty
    if (!editingWordId && wordId && (!wordForm.phonetic.trim() || !wordForm.definition_en.trim() || !wordForm.definition_ja.trim())) {
      triggerSingleWordSync(wordId, wordForm.word.trim());
    }
  };

  const handleDeleteWord = async (wordId: number) => {
    if (!confirm('Delete this word? This will also clear its learning statistics.')) return;
    await db.transaction('rw', [db.words, db.viewLogs, db.testLogs], async () => {
      await db.viewLogs.where('word_id').equals(wordId).delete();
      await db.testLogs.where('word_id').equals(wordId).delete();
      await db.words.delete(wordId);
    });
    if (activeSetId) {
      loadActiveSet(activeSetId);
    }
  };

  // --- Auto-Sync Features ---
  const triggerSingleWordSync = async (wordId: number, wordStr: string) => {
    try {
      const meta = await fetchWordMetadata(wordStr);
      await db.words.update(wordId, {
        phonetic: meta.phonetic,
        definition_en: meta.definition_en,
        definition_ja: meta.definition_ja,
        sentences: meta.sentences
      });
      if (activeSetId) {
        loadActiveSet(activeSetId);
      }
    } catch (err) {
      console.error('Failed syncing single word metadata:', err);
    }
  };

  const handleBulkSync = async () => {
    if (!activeSetId || words.length === 0) return;

    // Find all incomplete words
    const incompleteWords = words.filter(w => !w.phonetic || !w.definition_en || !w.definition_ja);
    if (incompleteWords.length === 0) {
      alert('All words in this set already have complete metadata!');
      return;
    }

    setSyncProgress({ active: true, current: 0, total: incompleteWords.length });

    for (let i = 0; i < incompleteWords.length; i++) {
      const w = incompleteWords[i];
      setSyncProgress(prev => ({ ...prev, current: i + 1 }));
      await triggerSingleWordSync(w.id!, w.word);
      // Throttle for 600ms to avoid overloading the public APIs
      await new Promise(resolve => setTimeout(resolve, 600));
    }

    setSyncProgress({ active: false, current: 0, total: 0 });
    alert('Synchronization complete!');
  };

  // --- CSV Import & Export ---
  const handleExportCSVForSet = async (setId: number, setName: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const setWords = await db.words.where('set_id').equals(setId).toArray();
      if (setWords.length === 0) {
        alert('This word set has no words to export!');
        return;
      }
      csvService.exportToCSV(setWords, setName);
    } catch (err) {
      console.error('Failed to export CSV:', err);
    }
  };

  const handleSyncSeeds = async () => {
    setIsSyncingSeeds(true);
    try {
      const report = await syncSeedsToDatabase();
      setSyncReport(report);
      setIsSyncReportModalOpen(true);
      loadSets();
      if (activeSetId) {
        loadActiveSet(activeSetId);
      }
    } catch (err) {
      console.error('Failed syncing seeds:', err);
      alert('Failed to sync seeds database.');
    } finally {
      setIsSyncingSeeds(false);
    }
  };

  const handleSaveToSeed = async () => {
    if (!activeSet || words.length === 0) return;
    setIsSavingSeed(true);
    const escapeCsv = (str: string) => `"${(str || '').replace(/"/g, '""')}"`;
    try {
      const headers = ['Word', 'Phonetic', 'Definition_EN', 'Definition_JA', 'Sentence_1', 'Sentence_2', 'Sentence_3'];
      const csvRows = [headers.join(',')];

      for (const w of words) {
        const row = [
          escapeCsv(w.word),
          escapeCsv(w.phonetic || ''),
          escapeCsv(w.definition_en || ''),
          escapeCsv(w.definition_ja || ''),
          escapeCsv(w.sentences?.[0] || ''),
          escapeCsv(w.sentences?.[1] || ''),
          escapeCsv(w.sentences?.[2] || '')
        ];
        csvRows.push(row.join(','));
      }

      const csvContent = csvRows.join('\r\n');

      const res = await fetch('/api/save-seed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          setName: activeSet.name,
          csvContent
        })
      });

      if (!res.ok) {
        throw new Error('Server returned error response');
      }

      const data = await res.json();
      if (data.success) {
        setSaveStatus({ type: 'success', message: `Successfully persisted "${activeSet.name}" to local seeds folder!` });
        setTimeout(() => setSaveStatus({ type: null, message: '' }), 4000);
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (err: any) {
      console.error('Failed to save to seed:', err);
      setSaveStatus({
        type: 'error',
        message: 'Failed to write to local seeds. Please ensure the local VocabBloom server is running.'
      });
      setTimeout(() => setSaveStatus({ type: null, message: '' }), 6000);
    } finally {
      setIsSavingSeed(false);
    }
  };

  const processCSVFile = async (file: File) => {
    if (!activeSetId) return;

    try {
      const parsedRows = await csvService.parseCSVFile(file);
      if (parsedRows.length === 0) {
        setImportStatus({ type: 'error', message: 'The CSV file is empty, missing a "Word" header, or has no valid rows.' });
        return;
      }

      const newWords: Omit<Word, 'id'>[] = parsedRows.map(row => ({
        set_id: activeSetId,
        word: row.word,
        phonetic: row.phonetic || '',
        definition_en: row.definition_en || '',
        definition_ja: row.definition_ja || '',
        sentences: row.sentences || [],
        created_at: new Date()
      }));

      // Bulk insert
      await db.words.bulkAdd(newWords);
      loadActiveSet(activeSetId);
      setImportStatus({ type: 'success', message: `Successfully imported ${newWords.length} words!` });

      // Clear import status in 3 seconds
      setTimeout(() => {
        setImportStatus({ type: null, message: '' });
      }, 3000);

    } catch (err) {
      console.error('Error importing CSV:', err);
      setImportStatus({ type: 'error', message: 'Failed to parse CSV. Check file format.' });
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.name.endsWith('.csv')) {
      processCSVFile(file);
    } else {
      setImportStatus({ type: 'error', message: 'Please upload a valid .csv file.' });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processCSVFile(file);
    }
  };

  // --- Render Word Set List ---
  if (!activeSet) {
    return (
      <div className="view-container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <h2 style={{ marginBottom: '2px', fontSize: '20px' }}>My Word Sets 🗂️</h2>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '11px',
              fontWeight: 600,
              color: isServerActive ? 'var(--color-success)' : 'var(--text-secondary)',
              backgroundColor: isServerActive ? 'var(--color-success-soft)' : 'var(--border-color)',
              padding: '3px 8px',
              borderRadius: '20px',
              transition: 'all 0.3s ease',
              opacity: 0.95
            }}>
              <span className={isServerActive ? 'pulsing-dot' : 'static-dot'} style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: isServerActive ? 'var(--color-success)' : 'var(--text-secondary)',
                display: 'inline-block'
              }} />
              {isServerActive ? 'Dev Connected' : 'Standalone Mode'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn btn-outline" style={{ padding: '8px 14px', borderRadius: '12px' }} onClick={handleSyncSeeds} disabled={isSyncingSeeds}>
              <RefreshCw size={14} className={isSyncingSeeds ? 'animate-spin' : ''} style={{ marginRight: '6px', display: 'inline', verticalAlign: 'middle' }} />
              {isSyncingSeeds ? 'Syncing...' : 'Sync Seeds'}
            </button>
            <button className="btn btn-primary" style={{ padding: '8px 14px', borderRadius: '12px' }} onClick={() => { setEditingSetId(null); setSetFormName(''); setIsSetModalOpen(true); }}>
              <Plus size={18} /> New Set
            </button>
          </div>
        </div>

        {sets.length === 0 ? (
          <div className="glass" style={{ padding: '40px 20px', textAlign: 'center', borderRadius: '24px' }}>
            <FileText size={48} style={{ color: 'var(--text-secondary)', marginBottom: '16px', opacity: 0.5 }} />
            <p>No word sets found.</p>
            <p style={{ fontSize: '13px', marginTop: '6px' }}>Click "New Set" to begin your English learning journey!</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {sets.map(s => (
              <SetCardRow
                key={s.id}
                setObj={s}
                onSelectSet={onSelectSet}
                onEditSet={(setId, name) => { setEditingSetId(setId); setSetFormName(name); setIsSetModalOpen(true); }}
                onExportSet={handleExportCSVForSet}
                onDeleteSet={handleDeleteSet}
              />
            ))}
          </div>
        )}

        {/* Set Form Modal */}
        {isSetModalOpen && (
          <div className="modal-overlay">
            <form className="modal-content" onSubmit={handleSaveSet}>
              <div className="modal-header">
                <span className="modal-title">{editingSetId ? 'Rename Word Set' : 'Create Word Set'}</span>
                <button type="button" className="btn-icon-only" style={{ width: '32px', height: '32px' }} onClick={() => setIsSetModalOpen(false)}>
                  <X size={14} />
                </button>
              </div>
              <div className="form-group">
                <label className="form-label">Set Name</label>
                <input type="text" className="input-field" placeholder="e.g. Daily Conversation ☕" value={setFormName} onChange={e => setSetFormName(e.target.value)} autoFocus required />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsSetModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save</button>
              </div>
            </form>
          </div>
        )}

        {/* Sync Report Modal */}
        {isSyncReportModalOpen && syncReport && (
          <div className="modal-overlay">
            <div className="modal-content" style={{ overflowY: 'auto', maxHeight: '80vh', maxWidth: '500px' }}>
              <div className="modal-header">
                <span className="modal-title">Sync Complete! 🎉</span>
                <button type="button" className="btn-icon-only" style={{ width: '32px', height: '32px' }} onClick={() => setIsSyncReportModalOpen(false)}>
                  <X size={14} />
                </button>
              </div>
              <div style={{ padding: '10px 0', textAlign: 'left' }}>
                <p style={{ fontSize: '14px', marginBottom: '12px' }}>
                  The local database has been successfully synchronized with the seed files.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
                  <div className="glass" style={{ padding: '12px', textAlign: 'center', borderRadius: '12px' }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--color-success)' }}>{syncReport.addedCount}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>New Words Added</div>
                  </div>
                  <div className="glass" style={{ padding: '12px', textAlign: 'center', borderRadius: '12px' }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--color-primary)' }}>{syncReport.skippedCount}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Preserved (Skipped)</div>
                  </div>
                </div>

                {syncReport.skippedWords.length > 0 && (
                  <div>
                    <h4 style={{ fontSize: '13px', marginBottom: '6px', color: 'var(--text-primary)' }}>Preserved Words:</h4>
                    <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                      The following words already existed in IndexedDB and were preserved to protect your manual changes/learning logs:
                    </p>
                    <div className="glass" style={{
                      padding: '10px',
                      borderRadius: '8px',
                      maxHeight: '150px',
                      overflowY: 'auto',
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '6px',
                      backgroundColor: 'rgba(0,0,0,0.05)'
                    }}>
                      {syncReport.skippedWords.map((word, idx) => (
                        <span key={idx} style={{
                          fontSize: '11px',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          background: 'var(--color-primary-soft)',
                          color: 'var(--color-primary)',
                          fontWeight: 500
                        }}>
                          {word}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer" style={{ padding: '12px 0 0 0' }}>
                <button type="button" className="btn btn-primary" style={{ width: '100%' }} onClick={() => setIsSyncReportModalOpen(false)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // --- Render Word List (Set Detail) ---
  return (
    <div className="view-container">
      {/* Header back button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
        <button className="btn-icon-only" style={{ width: '36px', height: '36px' }} onClick={() => onSelectSet(0)}>
          <ArrowLeft size={16} />
        </button>
        <div style={{ textAlign: 'left' }}>
          <h2 style={{ fontSize: '18px' }}>{activeSet.name}</h2>
          <p style={{ fontSize: '12px' }}>Manage vocabulary words and offline configurations.</p>
        </div>
      </div>

      {/* Synchronize & Persist/Save to Seed bar */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: isServerActive ? '1fr 1fr' : '1fr', 
        gap: '10px', 
        marginBottom: '16px' 
      }}>
        {isServerActive && (
          <button className="btn btn-outline" style={{ padding: '10px', fontSize: '14px', borderRadius: '12px' }} onClick={handleSaveToSeed} disabled={words.length === 0 || isSavingSeed}>
            <Download size={16} className={isSavingSeed ? 'animate-spin' : ''} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
            {isSavingSeed ? 'Saving...' : 'Save to Seed 💾'}
          </button>
        )}
        <button className="btn btn-primary" style={{ padding: '10px', fontSize: '14px', borderRadius: '12px' }} onClick={handleBulkSync} disabled={words.length === 0 || syncProgress.active}>
          <RefreshCw size={16} className={syncProgress.active ? 'animate-spin' : ''} /> {syncProgress.active ? 'Syncing...' : 'Sync Set'}
        </button>
      </div>

      {/* Sync progress indicator */}
      {syncProgress.active && (
        <div className="glass" style={{ padding: '12px 16px', marginBottom: '16px', borderRadius: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
            <span>Syncing word definitions...</span>
            <strong>{syncProgress.current} / {syncProgress.total}</strong>
          </div>
          <div className="progress-bar-container">
            <div className="progress-bar-fill" style={{ width: `${(syncProgress.current / syncProgress.total) * 100}%` }}></div>
          </div>
        </div>
      )}

      {/* Drag & Drop Area */}
      <div
        className={`drag-drop-area ${isDragOver ? 'dragover' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{ marginBottom: '20px' }}
      >
        <Upload size={24} style={{ color: 'var(--color-primary)', marginBottom: '8px', opacity: 0.8 }} />
        <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>Import Words from CSV</p>
        <p style={{ fontSize: '12px', marginTop: '2px' }}>Drag & drop your CSV file here, or click to upload</p>
        <input type="file" accept=".csv" onChange={handleFileChange} style={{ display: 'none' }} id="csv-file-input" />
        <label htmlFor="csv-file-input" className="btn btn-secondary" style={{ marginTop: '10px', padding: '6px 12px', fontSize: '13px', borderRadius: '8px' }}>
          Select File
        </label>
      </div>

      {/* Save Status Alert */}
      {saveStatus.type && (
        <div className={`glass`} style={{
          padding: '12px 16px',
          marginBottom: '20px',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          backgroundColor: saveStatus.type === 'success' ? 'var(--color-success-soft)' : 'var(--color-danger-soft)',
          borderColor: saveStatus.type === 'success' ? 'var(--color-success)' : 'var(--color-danger)',
          color: saveStatus.type === 'success' ? 'var(--color-success)' : 'var(--color-danger)'
        }}>
          {saveStatus.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
          <span style={{ fontSize: '13px', fontWeight: 600 }}>{saveStatus.message}</span>
        </div>
      )}

      {/* Import Status Alert */}
      {importStatus.type && (
        <div className={`glass`} style={{
          padding: '12px 16px',
          marginBottom: '20px',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          backgroundColor: importStatus.type === 'success' ? 'var(--color-success-soft)' : 'var(--color-danger-soft)',
          borderColor: importStatus.type === 'success' ? 'var(--color-success)' : 'var(--color-danger)',
          color: importStatus.type === 'success' ? 'var(--color-success)' : 'var(--color-danger)'
        }}>
          {importStatus.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
          <span style={{ fontSize: '13px', fontWeight: 600 }}>{importStatus.message}</span>
        </div>
      )}

      {/* Quick Add Word bar */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        <button className="btn btn-primary" style={{ width: '100%', borderRadius: '12px' }} onClick={() => handleOpenWordModal()}>
          <Plus size={18} /> Add New Word
        </button>
      </div>

      {/* Words List */}
      <h3>Vocabulary Words ({words.length})</h3>

      {words.length === 0 ? (
        <div className="glass" style={{ padding: '30px 16px', textAlign: 'center', marginTop: '12px', borderRadius: '16px' }}>
          <p style={{ fontSize: '14px' }}>No words added to this set yet.</p>
          <p style={{ fontSize: '12px', marginTop: '4px' }}>Click "Add New Word" or upload a CSV file to begin!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
          {words.map(w => (
            <div key={w.id} className="glass" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderRadius: '16px' }}>
              <div style={{ textAlign: 'left' }}>
                <strong style={{ fontSize: '16px', color: 'var(--text-primary)' }}>{w.word}</strong>
                {w.phonetic && <span style={{ marginLeft: '8px', fontSize: '13px', color: 'var(--color-primary)', fontWeight: 500 }}>{w.phonetic}</span>}
                <p style={{ fontSize: '13px', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '240px' }}>
                  {w.definition_ja || <span style={{ color: 'var(--color-danger)', fontStyle: 'italic', fontSize: '12px' }}>Missing definition</span>}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn-icon-only" style={{ width: '32px', height: '32px' }} onClick={() => handleOpenWordModal(w)}>
                  <Edit size={14} />
                </button>
                <button className="btn-icon-only" style={{ width: '32px', height: '32px', color: 'var(--color-danger)' }} onClick={() => handleDeleteWord(w.id!)}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Word Add/Edit Modal */}
      {isWordModalOpen && (
        <div className="modal-overlay">
          <form className="modal-content" onSubmit={handleSaveWord} style={{ overflowY: 'auto', maxHeight: '90vh' }}>
            <div className="modal-header">
              <span className="modal-title">{editingWordId ? 'Edit Vocabulary Word' : 'Add Vocabulary Word'}</span>
              <button type="button" className="btn-icon-only" style={{ width: '32px', height: '32px' }} onClick={() => setIsWordModalOpen(false)}>
                <X size={14} />
              </button>
            </div>

            <div className="form-group">
              <label className="form-label">English Word</label>
              <input type="text" className="input-field" placeholder="e.g. courageous" value={wordForm.word} onChange={e => setWordForm({ ...wordForm, word: e.target.value })} required disabled={editingWordId !== null} />
            </div>

            <div className="form-group">
              <label className="form-label">Phonetic Symbols (Optional)</label>
              <input type="text" className="input-field" placeholder="e.g. /kəˈreɪ.dʒəs/" value={wordForm.phonetic} onChange={e => setWordForm({ ...wordForm, phonetic: e.target.value })} />
            </div>

            <div className="form-group">
              <label className="form-label">English Definition (Optional)</label>
              <input type="text" className="input-field" placeholder="Simple English explanation..." value={wordForm.definition_en} onChange={e => setWordForm({ ...wordForm, definition_en: e.target.value })} />
            </div>

            <div className="form-group">
              <label className="form-label">Japanese Definition (Optional)</label>
              <input type="text" className="input-field" placeholder="日本語訳..." value={wordForm.definition_ja} onChange={e => setWordForm({ ...wordForm, definition_ja: e.target.value })} />
            </div>

            <div className="form-group" style={{ marginBottom: '8px' }}>
              <label className="form-label">Example Sentences (Max 3, Optional)</label>
              <input type="text" className="input-field" placeholder="Sentence 1..." value={wordForm.sentence1} onChange={e => setWordForm({ ...wordForm, sentence1: e.target.value })} style={{ marginBottom: '6px' }} />
              <input type="text" className="input-field" placeholder="Sentence 2..." value={wordForm.sentence2} onChange={e => setWordForm({ ...wordForm, sentence2: e.target.value })} style={{ marginBottom: '6px' }} />
              <input type="text" className="input-field" placeholder="Sentence 3..." value={wordForm.sentence3} onChange={e => setWordForm({ ...wordForm, sentence3: e.target.value })} />
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setIsWordModalOpen(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Save Word</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
