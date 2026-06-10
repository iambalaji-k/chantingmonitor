import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { db } from '../utils/db';
import { PlaybackEngine } from '../utils/playbackEngine';

export type ChantingPhase = 'pranam1' | 'mantra' | 'pranam2' | 'chime';

interface ChantingContextType {
  // Session State
  isPlaying: boolean;
  roundCount: number;
  currentBead: number;
  currentPhase: ChantingPhase;
  currentSpeed: number;
  elapsedSeconds: number;
  dailyGoal: number;
  hapticEnabled: boolean;
  theme: string;
  notificationEnabled: boolean;
  isLoading: boolean;
  
  // Actions
  togglePlay: () => void;
  pause: () => void;
  play: () => void;
  restartRound: () => void;
  setSpeed: (speed: number) => void;
  setBeadManually: (bead: number) => void;
  setRoundsManually: (rounds: number) => void;
  setGoal: (goal: number) => void;
  setHaptic: (enabled: boolean) => void;
  setThemePreference: (theme: string) => void;
  setNotificationEnabled: (enabled: boolean) => Promise<void>;
  resetAllUserData: () => Promise<void>;
  
  // Data Import/Export
  exportData: () => Promise<string>;
  importData: (json: string) => Promise<boolean>;
}

const ChantingContext = createContext<ChantingContextType | undefined>(undefined);

const getTodayDateKey = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const ChantingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [roundCount, setRoundCount] = useState(0);
  const [currentBead, setCurrentBead] = useState(0); // 0 = not started or opening pranam
  const [currentPhase, setCurrentPhase] = useState<ChantingPhase>('pranam1');
  const [currentSpeed, setCurrentSpeed] = useState(5); // Default fastest
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  
  // Settings
  const [dailyGoal, setDailyGoal] = useState(16);
  const [hapticEnabled, setHapticEnabled] = useState(true);
  const [theme, setTheme] = useState('dark');
  const [notificationEnabled, setNotificationEnabledState] = useState(true);
  
  const [currentDateKey, setCurrentDateKey] = useState(getTodayDateKey());
  
  // Playback engine ref
  const playbackEngineRef = useRef<PlaybackEngine | null>(null);

  // State ref for event listeners / timer
  const stateRef = useRef({
    isPlaying,
    currentPhase,
    currentBead,
    currentSpeed,
    roundCount,
    elapsedSeconds,
    hapticEnabled,
  });

  useEffect(() => {
    stateRef.current = {
      isPlaying,
      currentPhase,
      currentBead,
      currentSpeed,
      roundCount,
      elapsedSeconds,
      hapticEnabled,
    };
  }, [isPlaying, currentPhase, currentBead, currentSpeed, roundCount, elapsedSeconds, hapticEnabled]);

  // Initialize playback engine on mount
  useEffect(() => {
    const engine = new PlaybackEngine();
    playbackEngineRef.current = engine;
    
    // Preload audio assets in the background
    engine.preloadAll();

    // Callback when engine changes state (bead/phase/round change)
    engine.onStateChange = ({ phase, bead, roundIncrement }) => {
      setCurrentPhase(phase);
      setCurrentBead(bead);
      
      if (roundIncrement) {
        setRoundCount(prev => {
          const next = prev + 1;
          const today = getTodayDateKey();
          db.addProgress(today, 1, 0);
          
          if (stateRef.current.hapticEnabled && 'vibrate' in navigator) {
            try {
              navigator.vibrate([150, 80, 150]);
            } catch (e) {
              console.warn('Vibration failed:', e);
            }
          }
          return next;
        });
      }
    };

    // Callback when engine plays/pauses
    engine.onPlayPause = (playing) => {
      setIsPlaying(playing);
    };

    // Setup media session action handlers
    if ('mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('play', () => {
        engine.resume();
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        engine.pause();
      });
      navigator.mediaSession.setActionHandler('stop', () => {
        engine.pause();
        const audio = engine.getAudioElement();
        if (audio) {
          audio.currentTime = 0;
        }
      });
    }

    // Window focus and visibility change listeners for focus recovery
    const handleFocusRecovery = () => {
      const audio = engine.getAudioElement();
      if (engine.isPlaying && audio && audio.paused && !engine.isUserPaused) {
        console.log('Focus/Visibility recovery: Playback engine was playing but audio element was paused. Resuming play.');
        engine.resume();
      }
    };

    window.addEventListener('focus', handleFocusRecovery);
    window.addEventListener('blur', handleFocusRecovery);
    document.addEventListener('visibilitychange', handleFocusRecovery);

    return () => {
      window.removeEventListener('focus', handleFocusRecovery);
      window.removeEventListener('blur', handleFocusRecovery);
      document.removeEventListener('visibilitychange', handleFocusRecovery);
      engine.destroy();
    };
  }, []);

  // Load configuration and session from IndexedDB on startup
  useEffect(() => {
    const initializeFromDB = async () => {
      try {
        const settings = await db.getSettings();
        setDailyGoal(settings.dailyGoal);
        setHapticEnabled(settings.hapticEnabled);
        setCurrentSpeed(settings.speedPreference);
        setTheme(settings.theme);
        setNotificationEnabledState(settings.notificationEnabled);

        // Load active daily stats to see if we completed rounds today already
        const todayKey = getTodayDateKey();
        const todayStat = await db.getStats(todayKey);
        if (todayStat) {
          setRoundCount(todayStat.rounds);
          setElapsedSeconds(todayStat.seconds);
        }

        const session = await db.getSession();
        let initialBead = 0;
        let initialPhase: ChantingPhase = 'pranam1';
        let initialSpeed = settings.speedPreference;

        if (session) {
          initialBead = session.beadCount;
          initialSpeed = session.currentSpeed;
          
          if (session.beadCount === 0) {
            initialPhase = 'pranam1';
          } else if (session.beadCount > 0 && session.beadCount <= 108) {
            initialPhase = 'mantra';
          } else if (session.beadCount === 108) {
            initialPhase = 'pranam2';
          }
          
          setCurrentBead(session.beadCount);
          setCurrentSpeed(session.currentSpeed);
          setCurrentPhase(initialPhase);
        }

        // Initialize queue in playback engine
        if (playbackEngineRef.current) {
          playbackEngineRef.current.generateQueue(initialPhase, initialBead, initialSpeed);
          // Set speed initially in the engine
          playbackEngineRef.current.changeSpeed(initialSpeed);
        }
      } catch (err) {
        console.error('Failed to restore data from IndexedDB:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initializeFromDB();
  }, []);

  // Update Media Session Metadata
  useEffect(() => {
    if ('mediaSession' in navigator) {
      let title = 'Hare Krishna Maha-Mantra';
      let artworkSrc = '/favicon.svg';

      if (currentPhase === 'pranam1') {
        title = 'Opening Pranam Mantra';
      } else if (currentPhase === 'pranam2') {
        title = 'Closing Pranam Mantra';
      } else if (currentPhase === 'chime') {
        title = 'Bell Chime';
      } else if (currentPhase === 'mantra') {
        title = 'Hare Krishna Chanting';
      }

      navigator.mediaSession.metadata = new MediaMetadata({
        title,
        artist: 'Japa Companion',
        album: 'Chanting Monitor',
        artwork: [
          { src: artworkSrc, sizes: '192x192', type: 'image/svg+xml' },
          { src: artworkSrc, sizes: '512x512', type: 'image/svg+xml' }
        ]
      });
    }
  }, [currentPhase]);

  // Timer Tick (Active chanting elapsed seconds tracker)
  useEffect(() => {
    let interval: any = null;
    if (isPlaying && !isLoading) {
      interval = setInterval(() => {
        // Increment session seconds
        setElapsedSeconds(prev => {
          const next = prev + 1;

          // Save active session state every 5 seconds to reduce IndexedDB writes
          if (next % 5 === 0) {
            db.saveSession({
              beadCount: currentBead,
              roundCount: roundCount,
              currentSpeed: currentSpeed,
              elapsedSeconds: next,
              isPlaying: true,
              lastUpdated: Date.now()
            });
          }

          // Add 1 second of chanting to today's stats in database
          const today = getTodayDateKey();
          db.addProgress(today, 0, 1);

          return next;
        });

        // Midnight check
        const today = getTodayDateKey();
        if (today !== currentDateKey) {
          handleMidnightReset(today);
        }
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, isLoading, currentBead, roundCount, currentSpeed, currentDateKey]);

  // Handle midnight reset
  const handleMidnightReset = (newDateKey: string) => {
    setCurrentDateKey(newDateKey);
    setRoundCount(0);
    setElapsedSeconds(0);
    setCurrentBead(0);
    setCurrentPhase('pranam1');
    db.clearSession();
    if (playbackEngineRef.current) {
      playbackEngineRef.current.setBeadManually(0);
    }
  };

  // Save session state immediately on key transitions
  useEffect(() => {
    if (isLoading) return;
    db.saveSession({
      beadCount: currentBead,
      roundCount: roundCount,
      currentSpeed: currentSpeed,
      elapsedSeconds: elapsedSeconds,
      isPlaying: isPlaying,
      lastUpdated: Date.now()
    });
  }, [currentBead, roundCount, currentSpeed, isPlaying, isLoading]);

  // Helper to show/update PWA notification progress bar
  const updateNotification = async (
    playing: boolean,
    phase: ChantingPhase,
    bead: number,
    rounds: number,
    enabled: boolean
  ) => {
    if (!enabled) return;
    if (!('serviceWorker' in navigator) || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    try {
      const swReady = navigator.serviceWorker.ready;
      const timeoutPromise = new Promise<ServiceWorkerRegistration>((_, reject) => 
        setTimeout(() => reject(new Error('Service Worker ready timeout')), 2000)
      );
      
      const reg = await Promise.race([swReady, timeoutPromise]);
      
      let bodyText = `Round: ${rounds} • Bead: ${bead}/108`;
      if (phase === 'pranam1') {
        bodyText = `Opening Pranam Mantra • Round: ${rounds}`;
      } else if (phase === 'pranam2') {
        bodyText = `Closing Pranam Mantra • Round: ${rounds}`;
      } else if (phase === 'chime') {
        bodyText = `Round Finished! Bell Chime`;
      }

      await reg.showNotification('Japa Progress Tracker', {
        body: bodyText,
        icon: '/favicon.svg',
        badge: '/favicon.svg',
        tag: 'chanting-progress',
        silent: true,
        renotify: false,
        actions: [
          {
            action: 'play-pause',
            title: playing ? 'Pause ⏸️' : 'Play ▶️'
          }
        ]
      } as any);
    } catch (err) {
      console.warn('Failed to show progress notification:', err);
    }
  };

  // Helper to clear progress notification
  const clearNotification = async () => {
    if (!('serviceWorker' in navigator)) return;
    try {
      const reg = await navigator.serviceWorker.ready;
      const notifications = await reg.getNotifications({ tag: 'chanting-progress' });
      notifications.forEach(n => n.close());
    } catch (err) {
      console.warn('Failed to clear notification:', err);
    }
  };

  // Listen for actions sent from the Service Worker notification
  useEffect(() => {
    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'notification-action') {
        const action = event.data.action;
        if (action === 'play-pause') {
          if (playbackEngineRef.current) {
            if (playbackEngineRef.current.isPlaying) {
              playbackEngineRef.current.pause();
            } else {
              playbackEngineRef.current.resume();
            }
          }
        }
      }
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
    }

    return () => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
      }
    };
  }, []);

  // Sync notification progress with player state
  useEffect(() => {
    if (isLoading) return;
    if (notificationEnabled) {
      updateNotification(isPlaying, currentPhase, currentBead, roundCount, notificationEnabled);
    } else {
      clearNotification();
    }
  }, [isPlaying, currentPhase, currentBead, roundCount, notificationEnabled, isLoading]);

  // Close notification on unmount/cleanup
  useEffect(() => {
    return () => {
      clearNotification();
    };
  }, []);

  // Actions
  const togglePlay = async () => {
    if (!playbackEngineRef.current) return;

    if (!isPlaying && notificationEnabled && 'Notification' in window && Notification.permission === 'default') {
      try {
        await Notification.requestPermission();
      } catch (e) {
        console.warn('Failed to request notification permission on togglePlay gesture:', e);
      }
    }

    if (isPlaying) {
      playbackEngineRef.current.pause();
    } else {
      playbackEngineRef.current.resume();
    }
  };

  const pause = () => {
    if (playbackEngineRef.current) {
      playbackEngineRef.current.pause();
    }
  };

  const play = async () => {
    if (notificationEnabled && 'Notification' in window && Notification.permission === 'default') {
      try {
        await Notification.requestPermission();
      } catch (e) {
        console.warn('Failed to request notification permission on play gesture:', e);
      }
    }
    if (playbackEngineRef.current) {
      playbackEngineRef.current.resume();
    }
  };
  
  const restartRound = () => {
    if (playbackEngineRef.current) {
      playbackEngineRef.current.setBeadManually(0);
    }
  };

  const setSpeed = async (speed: number) => {
    setCurrentSpeed(speed);
    if (playbackEngineRef.current) {
      playbackEngineRef.current.changeSpeed(speed);
    }
    const settings = await db.getSettings();
    await db.saveSettings({ ...settings, speedPreference: speed });
  };

  const setBeadManually = (bead: number) => {
    if (playbackEngineRef.current) {
      playbackEngineRef.current.setBeadManually(bead);
    }
  };

  const setRoundsManually = async (rounds: number) => {
    const targetRounds = Math.max(0, rounds);
    setRoundCount(targetRounds);
    
    // Sync to today's stats in DB
    const today = getTodayDateKey();
    const existing = await db.getStats(today);
    await db.saveStats({
      date: today,
      rounds: targetRounds,
      seconds: existing ? existing.seconds : elapsedSeconds
    });
  };

  const setGoal = async (goal: number) => {
    const targetGoal = Math.max(1, goal);
    setDailyGoal(targetGoal);
    const settings = await db.getSettings();
    await db.saveSettings({ ...settings, dailyGoal: targetGoal });
  };

  const setHaptic = async (enabled: boolean) => {
    setHapticEnabled(enabled);
    const settings = await db.getSettings();
    await db.saveSettings({ ...settings, hapticEnabled: enabled });
  };

  const setThemePreference = async (themePref: string) => {
    setTheme(themePref);
    const settings = await db.getSettings();
    await db.saveSettings({ ...settings, theme: themePref });
  };

  const setNotificationEnabled = async (enabled: boolean) => {
    if (enabled && 'Notification' in window && Notification.permission !== 'granted') {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setNotificationEnabledState(false);
        const settings = await db.getSettings();
        await db.saveSettings({ ...settings, notificationEnabled: false });
        return;
      }
    }
    
    setNotificationEnabledState(enabled);
    const settings = await db.getSettings();
    await db.saveSettings({ ...settings, notificationEnabled: enabled });
    
    if (!enabled) {
      clearNotification();
    }
  };

  const resetAllUserData = async () => {
    clearNotification();
    if (playbackEngineRef.current) {
      playbackEngineRef.current.pause();
      playbackEngineRef.current.destroy();
      playbackEngineRef.current.generateQueue('pranam1', 0, 5);
    }
    await db.resetAll();
    
    // Reset state to defaults
    setRoundCount(0);
    setCurrentBead(0);
    setCurrentPhase('pranam1');
    setCurrentSpeed(5);
    setElapsedSeconds(0);
    setDailyGoal(16);
    setHapticEnabled(true);
    setTheme('dark');
    setNotificationEnabledState(true);
  };

  const exportData = async () => {
    return await db.exportData();
  };

  const importData = async (json: string) => {
    const success = await db.importData(json);
    if (success) {
      // Reload states from DB
      const settings = await db.getSettings();
      setDailyGoal(settings.dailyGoal);
      setHapticEnabled(settings.hapticEnabled);
      setCurrentSpeed(settings.speedPreference);
      setTheme(settings.theme);
      setNotificationEnabledState(settings.notificationEnabled);

      const todayKey = getTodayDateKey();
      const todayStat = await db.getStats(todayKey);
      if (todayStat) {
        setRoundCount(todayStat.rounds);
        setElapsedSeconds(todayStat.seconds);
      }

      const session = await db.getSession();
      let initialBead = 0;
      let initialPhase: ChantingPhase = 'pranam1';
      let initialSpeed = settings.speedPreference;
      
      if (session) {
        initialBead = session.beadCount;
        initialSpeed = session.currentSpeed;
        if (session.beadCount === 0) {
          initialPhase = 'pranam1';
        } else if (session.beadCount > 0 && session.beadCount <= 108) {
          initialPhase = 'mantra';
        } else if (session.beadCount === 108) {
          initialPhase = 'pranam2';
        }
        
        setCurrentBead(session.beadCount);
        setCurrentSpeed(session.currentSpeed);
        setCurrentPhase(initialPhase);
      } else {
        setCurrentBead(0);
        setCurrentPhase('pranam1');
      }

      if (playbackEngineRef.current) {
        playbackEngineRef.current.generateQueue(initialPhase, initialBead, initialSpeed);
      }
    }
    return success;
  };

  return (
    <ChantingContext.Provider
      value={{
        isPlaying,
        roundCount,
        currentBead,
        currentPhase,
        currentSpeed,
        elapsedSeconds,
        dailyGoal,
        hapticEnabled,
        theme,
        notificationEnabled,
        isLoading,
        
        togglePlay,
        pause,
        play,
        restartRound,
        setSpeed,
        setBeadManually,
        setRoundsManually,
        setGoal,
        setHaptic,
        setThemePreference,
        setNotificationEnabled,
        resetAllUserData,
        
        exportData,
        importData
      }}
    >
      {children}
    </ChantingContext.Provider>
  );
};

export const useChanting = () => {
  const context = useContext(ChantingContext);
  if (context === undefined) {
    throw new Error('useChanting must be used within a ChantingProvider');
  }
  return context;
};
