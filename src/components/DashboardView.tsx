import React, { useState, useEffect } from 'react';
import { db, type WordSet } from '../db';
import { statsService, type WordWithStats } from '../services/statsService';
import { 
  ArrowUpDown, Search, ShieldAlert, Sparkles, RefreshCw 
} from 'lucide-react';

/**
 * DashboardView Component.
 * Renders vocabulary learning metrics including review count, total test quizzes,
 * accumulated errors rate, active learning days, and self-adaptive mastery levels.
 * Supports real-time filtering, cross-set statistics aggregation, and table-sorting.
 * 
 * @returns {React.JSX.Element} The rendered dashboard statistic page.
 */
export const DashboardView: React.FC = () => {
  const [sets, setSets] = useState<WordSet[]>([]);
  const [selectedSetId, setSelectedSetId] = useState<number | 'all'>('all');
  const [words, setWords] = useState<WordWithStats[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Sorting Configuration
  const [sortKey, setSortKey] = useState<keyof WordWithStats>('word');
  const [sortAsc, setSortAsc] = useState(true);

  useEffect(() => {
    loadSets();
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [selectedSetId]);

  /**
   * Loads all available word sets from IndexedDB to populate the filter drop-down list.
   */
  const loadSets = async () => {
    const list = await db.wordSets.toArray();
    setSets(list);
  };

  /**
   * Retrieves enriched vocabulary data with statistics from the statsService
   * for the selected set (or all sets) and updates the local state.
   */
  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const enriched = await statsService.getWordsWithStats(selectedSetId);
      setWords(enriched);
    } catch (err) {
      console.error('Failed to load dashboard statistics:', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Configures sorting states by toggling sort keys or inverting ascending/descending modes.
   * 
   * @param {keyof WordWithStats} key - The data attribute field to sort the table rows by.
   */
  const handleSort = (key: keyof WordWithStats) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  /**
   * Computes and renders a corresponding CSS mastery badge based on the word's error rates
   * and total test count history.
   * 
   * @param {WordWithStats} w - The vocabulary record object enriched with learning metrics.
   * @returns {React.JSX.Element} A badge chip element indicating mastery levels (Seedling, Sprout, Tree).
   */
  const renderMasteryBadge = (w: WordWithStats) => {
    if (w.tests === 0) {
      return <span className="badge badge-seed">🌱 New</span>;
    }
    if (w.errorRate > 50) {
      return <span className="badge badge-seed">🌱 Seedling</span>;
    }
    if (w.errorRate >= 20) {
      return <span className="badge badge-sprout">🌿 Sprout</span>;
    }
    // High test count + low errors = Tree
    if (w.tests >= 3 && w.errorRate < 20) {
      return <span className="badge badge-tree">🌳 Tree</span>;
    }
    return <span className="badge badge-sprout">🌿 Growing</span>;
  };

  // --- Filtering & Sorting ---
  const filteredWords = words.filter(w => 
    w.word.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedWords = [...filteredWords].sort((a, b) => {
    let valA = a[sortKey];
    let valB = b[sortKey];

    // Handle string sort
    if (typeof valA === 'string' && typeof valB === 'string') {
      return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
    }

    // Handle number/date sort
    if (typeof valA === 'number' && typeof valB === 'number') {
      return sortAsc ? valA - valB : valB - valA;
    }

    return 0;
  });

  return (
    <div className="view-container">
      <h2>Learning Statistics 📊</h2>
      <p style={{ marginBottom: '16px', fontSize: '13px' }}>Monitor your vocabulary learning stats, reviews, and test correctness.</p>

      {/* Select Set Selector & Search Bar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <select 
            className="input-field" 
            style={{ flex: 1, padding: '8px 12px', fontSize: '14px', borderRadius: '12px' }}
            value={selectedSetId} 
            onChange={(e) => setSelectedSetId(e.target.value as any)}
          >
            <option value="all">📂 All Word Sets</option>
            {sets.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <button className="btn-icon-only" style={{ width: '40px', height: '40px' }} onClick={loadDashboardData}>
            <RefreshCw size={16} />
          </button>
        </div>

        <div style={{ position: 'relative', width: '100%' }}>
          <input 
            type="text" 
            className="input-field" 
            placeholder="Search word..." 
            style={{ paddingLeft: '40px', borderRadius: '12px' }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Search size={16} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
          <RefreshCw className="animate-spin" size={32} style={{ color: 'var(--color-primary)' }} />
        </div>
      ) : words.length === 0 ? (
        <div className="glass" style={{ padding: '40px 20px', textAlign: 'center', borderRadius: '24px' }}>
          <ShieldAlert size={48} style={{ color: 'var(--text-secondary)', marginBottom: '16px', opacity: 0.5, alignSelf: 'center' }} />
          <p>No learning records found.</p>
          <p style={{ fontSize: '12px', marginTop: '4px' }}>Once you flip cards and take translation tests, your stats will show up here!</p>
        </div>
      ) : (
        <div className="glass" style={{ overflowX: 'auto', borderRadius: '20px', padding: '8px 12px' }}>
          <table className="dash-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('word')}>
                  Word <ArrowUpDown size={12} style={{ marginLeft: '2px', display: 'inline' }} />
                </th>
                <th className="text-center" onClick={() => handleSort('views')}>
                  Views <ArrowUpDown size={12} style={{ marginLeft: '2px', display: 'inline' }} />
                </th>
                <th className="text-center" onClick={() => handleSort('tests')}>
                  Quizzes <ArrowUpDown size={12} style={{ marginLeft: '2px', display: 'inline' }} />
                </th>
                <th className="text-center" onClick={() => handleSort('errorRate')}>
                  Errors <ArrowUpDown size={12} style={{ marginLeft: '2px', display: 'inline' }} />
                </th>
                <th className="text-right">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedWords.map(w => (
                <tr key={w.id}>
                  <td style={{ fontWeight: 600 }}>
                    <div>{w.word}</div>
                    <div style={{ fontSize: '11px', fontWeight: 400, color: 'var(--text-secondary)' }}>
                      {w.daysActive === 0 ? 'Today' : `${w.daysActive}d active`}
                    </div>
                  </td>
                  <td className="text-center">{w.views}</td>
                  <td className="text-center">{w.tests}</td>
                  <td className="text-center" style={{ color: w.errorRate > 40 ? 'var(--color-danger)' : 'var(--text-primary)' }}>
                    {w.errorRate > 0 ? `${w.errorRate}%` : '0%'}
                  </td>
                  <td className="text-right">
                    {renderMasteryBadge(w)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
};
