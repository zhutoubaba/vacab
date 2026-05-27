import { useState, useEffect } from 'react';
import { seedDatabase } from './db';
import { SetsView } from './components/SetsView';
import { LearnView } from './components/LearnView';
import { TestView } from './components/TestView';
import { DashboardView } from './components/DashboardView';
import { 
  BookOpen, FileText, Award, BarChart2, Sun, Moon, Sparkles 
} from 'lucide-react';

type TabType = 'sets' | 'learn' | 'test' | 'dashboard';

/**
 * Root component of the VocabBloom application.
 * Manages the active view state, local database initialization/seeding on launch,
 * system/user theme preferences, and mobile keyboard layout space adjustments.
 * 
 * @returns {React.JSX.Element} The rendered application shell with sticky header, active view tab, and bottom navigation.
 */
function App() {
  const [activeTab, setActiveTab] = useState<TabType>('sets');
  const [activeSetId, setActiveSetId] = useState<number | null>(null);
  
  // Step 1: Initialize Theme State by checking localStorage, falling back to system prefers-color-scheme media queries
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Step 2: Trigger Initial Database Seeding on application startup
  useEffect(() => {
    const initDb = async () => {
      try {
        await seedDatabase();
      } catch (err) {
        console.error('Failed to seed local database:', err);
      }
    };
    initDb();
  }, []);

  // Step 3: Apply the selected theme style class to the document root element
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  /**
   * Toggles the user interface theme between light (bright) and dark modes.
   * Persists the selected state to localStorage.
   */
  const toggleTheme = () => {
    setIsDarkMode(prev => !prev);
  };

  // Step 4: Track Mobile Soft Keyboard Active Status to prevent viewport elements distortion
  const [isInputFocused, setIsInputFocused] = useState(false);

  useEffect(() => {
    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      // Identify active inputs/textareas to flag keyboard visibility
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        setIsInputFocused(true);
      }
    };
    const handleFocusOut = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        setIsInputFocused(false);
      }
    };
    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);
    return () => {
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
    };
  }, []);

  // Step 5: Toggle layout adjusting CSS class on document body when keyboard is active
  useEffect(() => {
    if (isInputFocused) {
      document.body.classList.add('keyboard-active');
    } else {
      document.body.classList.remove('keyboard-active');
    }
  }, [isInputFocused]);

  /**
   * Sets the active vocabulary set ID and automatically transitions the view
   * to the flashcard learning tab.
   * 
   * @param {number} setId - The unique database ID of the selected word set, or 0 to deselect.
   */
  const handleSelectSet = (setId: number) => {
    if (setId === 0) {
      setActiveSetId(null);
    } else {
      setActiveSetId(setId);
      // Auto-transition to learn cards when a set is clicked to improve navigation comfort
      setActiveTab('learn');
    }
  };
  /**
   * Conditionally renders the appropriate sub-view component based on the active tab selection.
   * 
   * @returns {React.JSX.Element} The active view component (SetsView, LearnView, TestView, or DashboardView).
   */
  const renderView = () => {
    switch (activeTab) {
      case 'sets':
        return <SetsView onSelectSet={handleSelectSet} activeSetId={activeSetId} />;
      case 'learn':
        return <LearnView activeSetId={activeSetId} onSelectSet={handleSelectSet} />;
      case 'test':
        return <TestView activeSetId={activeSetId} onSelectSet={handleSelectSet} />;
      case 'dashboard':
        return <DashboardView />;
      default:
        return <SetsView onSelectSet={handleSelectSet} activeSetId={activeSetId} />;
    }
  };

  return (
    <>
      {/* Sticky App Header */}
      <header className="app-header">
        <div className="app-title">
          <Sparkles size={22} style={{ color: 'var(--color-secondary)' }} />
          <span>VocabBloom</span>
        </div>
        
        {/* HSL Switcher Toggle */}
        <div className="theme-switch" onClick={toggleTheme}>
          <div className="theme-switch-thumb">
            {isDarkMode ? <Moon size={13} fill="currentColor" /> : <Sun size={13} fill="currentColor" />}
          </div>
        </div>
      </header>

      {/* Dynamic Tab Body */}
      {renderView()}

      {/* Locked Bottom Mobile Navigation */}
      {!isInputFocused && (
        <nav className="bottom-nav">
          <button 
            className={`nav-item ${activeTab === 'sets' ? 'active' : ''}`}
            onClick={() => setActiveTab('sets')}
          >
            <FileText />
            <span>Sets</span>
          </button>
          <button 
            className={`nav-item ${activeTab === 'learn' ? 'active' : ''}`}
            onClick={() => setActiveTab('learn')}
          >
            <BookOpen />
            <span>Learn</span>
          </button>
          <button 
            className={`nav-item ${activeTab === 'test' ? 'active' : ''}`}
            onClick={() => setActiveTab('test')}
          >
            <Award />
            <span>Test</span>
          </button>
          <button 
            className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <BarChart2 />
            <span>Stats</span>
          </button>
        </nav>
      )}
    </>
  );
}

export default App;
