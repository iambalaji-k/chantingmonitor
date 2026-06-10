import { useState, useEffect } from 'react';
import { useChanting } from './context/ChantingContext';
import { MalaRing } from './components/MalaRing';
import { StatsDashboard } from './components/StatsDashboard';
import { SettingsPanel } from './components/SettingsPanel';
import { ManualAdjuster } from './components/ManualAdjuster';
import { db } from './utils/db';
import { 
  Play, 
  Pause, 
  Settings, 
  BarChart3, 
  Disc, 
  Flame 
} from 'lucide-react';

function App() {
  const {
    isPlaying,
    roundCount,
    currentBead,
    currentSpeed,
    elapsedSeconds,
    dailyGoal,
    theme,
    isLoading,
    togglePlay,
    setSpeed
  } = useChanting();

  const [activeTab, setActiveTab] = useState<'chant' | 'stats' | 'settings'>('chant');
  const [isAdjusterOpen, setIsAdjusterOpen] = useState(false);
  const [streakDays, setStreakDays] = useState(0);

  // Sync theme attribute on document root
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Load and calculate current streak on mount and round changes
  useEffect(() => {
    const loadStreak = async () => {
      try {
        const stats = await db.getAllStats();
        const streak = calculateStreak(stats);
        setStreakDays(streak);
      } catch (err) {
        console.warn('Failed to calculate streak:', err);
      }
    };
    loadStreak();
  }, [roundCount]);

  const calculateStreak = (allStats: any[]) => {
    if (allStats.length === 0) return 0;
    const sorted = [...allStats].sort((a, b) => a.date.localeCompare(b.date));
    const statsMap = new Map<string, number>();
    sorted.forEach(s => statsMap.set(s.date, s.rounds));

    const formatDate = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    let currentStreak = 0;
    const today = new Date();
    const todayStr = formatDate(today);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = formatDate(yesterday);

    let hasChantedToday = (statsMap.get(todayStr) || 0) > 0;
    let hasChantedYesterday = (statsMap.get(yesterdayStr) || 0) > 0;

    if (hasChantedToday) {
      currentStreak = 1;
      let streakDate = today;
      while (true) {
        streakDate.setDate(streakDate.getDate() - 1);
        const checkStr = formatDate(streakDate);
        if ((statsMap.get(checkStr) || 0) > 0) {
          currentStreak++;
        } else {
          break;
        }
      }
    } else if (hasChantedYesterday) {
      currentStreak = 1;
      let streakDate = yesterday;
      while (true) {
        streakDate.setDate(streakDate.getDate() - 1);
        const checkStr = formatDate(streakDate);
        if ((statsMap.get(checkStr) || 0) > 0) {
          currentStreak++;
        } else {
          break;
        }
      }
    }
    return currentStreak;
  };

  const formatSessionTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins < 60) {
      return `${mins}m ${String(secs).padStart(2, '0')}s`;
    }
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hrs}h ${String(remMins).padStart(2, '0')}m`;
  };

  const getSpeedLabel = (speed: number) => {
    switch(speed) {
      case 1: return 'S1 (Slowest)';
      case 2: return 'S2 (Slow)';
      case 3: return 'S3 (Medium)';
      case 4: return 'S4 (Fast)';
      case 5: return 'S5 (Fastest)';
      default: return `Speed ${speed}`;
    }
  };

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <span className="font-serif">Hare Krishna Japa...</span>
      </div>
    );
  }

  return (
    <>
      {/* Top Navigation Tabs */}
      <nav className="nav-tabs">
        <button 
          className={`nav-tab ${activeTab === 'chant' ? 'active' : ''}`}
          onClick={() => setActiveTab('chant')}
        >
          <Disc size={18} />
          Chant
        </button>
        <button 
          className={`nav-tab ${activeTab === 'stats' ? 'active' : ''}`}
          onClick={() => setActiveTab('stats')}
        >
          <BarChart3 size={18} />
          Stats
        </button>
        <button 
          className={`nav-tab ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          <Settings size={18} />
          Settings
        </button>
      </nav>

      {/* Main Content Area */}
      <main className="app-content">
        {activeTab === 'chant' && (
          <div className="chanting-container">
            {/* Top Stats Pills - Clickable to open Manual Adjuster */}
            <div className="top-stats-bar">
              <div className="stat-pill clickable" onClick={() => setIsAdjusterOpen(true)} title="Click to manually adjust rounds">
                <span className="stat-label">Rounds Today</span>
                <span className="stat-value">
                  <span className="stat-value-highlight">{roundCount}</span> / {dailyGoal}
                </span>
              </div>
              <div className="stat-pill clickable" onClick={() => setIsAdjusterOpen(true)} title="Click to manually adjust beads">
                <span className="stat-label">Current Bead</span>
                <span className="stat-value">
                  <span className="stat-value-highlight">{currentBead}</span> / 108
                </span>
              </div>
              <div className="stat-pill">
                <span className="stat-label">Chanting Time</span>
                <span className="stat-value">
                  {formatSessionTime(elapsedSeconds)}
                </span>
              </div>
            </div>

            {/* Streak Indicator (Pill at top center) */}
            {streakDays > 0 && (
              <div 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: 'rgba(243, 156, 18, 0.08)',
                  border: '1px solid var(--border-color)',
                  padding: '6px 12px',
                  borderRadius: '20px',
                  fontSize: '11px',
                  fontWeight: '600',
                  color: 'var(--accent-saffron)',
                  marginBottom: '10px'
                }}
              >
                <Flame size={12} fill="var(--accent-saffron)" stroke="var(--accent-saffron)" />
                <span>{streakDays} Day Streak</span>
              </div>
            )}

            {/* Circular progress japa mala */}
            <MalaRing />

            {/* Always visible playback controls */}
            <div className="playback-controls-wrapper">
              {/* Playback Button Controls Row */}
              <div className="control-buttons-row">
                <button 
                  className="btn-primary-play" 
                  onClick={togglePlay}
                  title={isPlaying ? 'Pause chanting' : 'Resume chanting'}
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? <Pause size={28} /> : <Play size={28} style={{ marginLeft: '4px' }} />}
                </button>
              </div>

              {/* Speed Controller Grid */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                <div className="speed-control-bar">
                  {[1, 2, 3, 4, 5].map((speed) => (
                    <button
                      key={speed}
                      className={`speed-btn ${currentSpeed === speed ? 'active' : ''}`}
                      onClick={() => setSpeed(speed)}
                    >
                      S{speed}
                    </button>
                  ))}
                </div>
                <span style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-secondary)' }}>
                  Current Speed: {getSpeedLabel(currentSpeed)}
                </span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'stats' && <StatsDashboard />}

        {activeTab === 'settings' && <SettingsPanel />}
      </main>

      {/* Manual Adjuster snap wheel picker drawer */}
      <ManualAdjuster 
        isOpen={isAdjusterOpen} 
        onClose={() => setIsAdjusterOpen(false)} 
      />
    </>
  );
}

export default App;
