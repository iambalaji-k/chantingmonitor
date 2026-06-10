import { openDB } from 'idb';
import type { IDBPDatabase } from 'idb';

export interface Settings {
  dailyGoal: number;
  hapticEnabled: boolean;
  speedPreference: number;
  theme: string;
}

export interface ChantingSession {
  beadCount: number;
  roundCount: number;
  currentSpeed: number;
  elapsedSeconds: number;
  isPlaying: boolean;
  lastUpdated: number;
}

export interface DailyStat {
  date: string; // YYYY-MM-DD
  rounds: number;
  seconds: number;
}

const DB_NAME = 'ChantingMonitorDB';
const DB_VERSION = 2;

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings');
        }
        if (!db.objectStoreNames.contains('session')) {
          db.createObjectStore('session');
        }
        if (!db.objectStoreNames.contains('daily_stats')) {
          db.createObjectStore('daily_stats', { keyPath: 'date' });
        }
      },
    });
  }
  return dbPromise;
}

export const db = {
  // Settings operations
  async getSettings(): Promise<Settings> {
    const database = await getDB();
    const settings = await database.get('settings', 'config');
    return settings || {
      dailyGoal: 16,
      hapticEnabled: true,
      speedPreference: 5,
      theme: 'dark',
    };
  },

  async saveSettings(settings: Settings): Promise<void> {
    const database = await getDB();
    await database.put('settings', settings, 'config');
  },

  // Session operations
  async getSession(): Promise<ChantingSession | null> {
    const database = await getDB();
    const session = await database.get('session', 'active');
    return session || null;
  },

  async saveSession(session: ChantingSession): Promise<void> {
    const database = await getDB();
    await database.put('session', session, 'active');
  },

  async clearSession(): Promise<void> {
    const database = await getDB();
    await database.delete('session', 'active');
  },

  // Daily Stats operations
  async getStats(date: string): Promise<DailyStat | null> {
    const database = await getDB();
    const stat = await database.get('daily_stats', date);
    return stat || null;
  },

  async saveStats(stat: DailyStat): Promise<void> {
    const database = await getDB();
    await database.put('daily_stats', stat);
    await this.cleanupOldStats();
  },

  async getAllStats(): Promise<DailyStat[]> {
    const database = await getDB();
    const stats = await database.getAll('daily_stats');
    // Sort by date ascending
    return stats.sort((a, b) => a.date.localeCompare(b.date));
  },

  async addProgress(date: string, rounds: number, seconds: number): Promise<DailyStat> {
    const database = await getDB();
    const tx = database.transaction('daily_stats', 'readwrite');
    const store = tx.objectStore('daily_stats');
    const existing = await store.get(date);
    
    const updated: DailyStat = existing
      ? {
          date,
          rounds: existing.rounds + rounds,
          seconds: existing.seconds + seconds,
        }
      : {
          date,
          rounds,
          seconds,
        };
        
    await store.put(updated);
    await tx.done;
    await this.cleanupOldStats();
    return updated;
  },

  // Keep only the most recent 7 days of stats
  async cleanupOldStats(): Promise<void> {
    const database = await getDB();
    const stats = await database.getAll('daily_stats');
    if (stats.length <= 7) return;

    // Sort by date ascending (oldest first), then delete elements from the start
    stats.sort((a, b) => a.date.localeCompare(b.date));
    
    const deleteCount = stats.length - 7;
    const toDelete = stats.slice(0, deleteCount);
    
    const tx = database.transaction('daily_stats', 'readwrite');
    const store = tx.objectStore('daily_stats');
    for (const item of toDelete) {
      await store.delete(item.date);
    }
    await tx.done;
  },

  // Export database as JSON
  async exportData(): Promise<string> {
    const settings = await this.getSettings();
    const session = await this.getSession();
    const database = await getDB();
    const dailyStats = await database.getAll('daily_stats');

    return JSON.stringify({
      version: 1,
      settings,
      session,
      dailyStats,
      exportedAt: Date.now()
    }, null, 2);
  },

  // Import database from JSON
  async importData(jsonString: string): Promise<boolean> {
    try {
      const data = JSON.parse(jsonString);
      if (!data || data.version !== 1) return false;

      const database = await getDB();
      const tx = database.transaction(['settings', 'session', 'daily_stats'], 'readwrite');
      
      if (data.settings) {
        await tx.objectStore('settings').put(data.settings, 'config');
      }
      if (data.session) {
        await tx.objectStore('session').put(data.session, 'active');
      } else {
        await tx.objectStore('session').delete('active');
      }
      
      const statsStore = tx.objectStore('daily_stats');
      await statsStore.clear();
      if (Array.isArray(data.dailyStats)) {
        for (const stat of data.dailyStats) {
          if (stat && stat.date && typeof stat.rounds === 'number' && typeof stat.seconds === 'number') {
            await statsStore.put(stat);
          }
        }
      }
      
      await tx.done;
      await this.cleanupOldStats();
      return true;
    } catch (e) {
      console.error('Failed to import data:', e);
      return false;
    }
  },

  // Clear all data
  async resetAll(): Promise<void> {
    const database = await getDB();
    const tx = database.transaction(['settings', 'session', 'daily_stats'], 'readwrite');
    await tx.objectStore('settings').clear();
    await tx.objectStore('session').clear();
    await tx.objectStore('daily_stats').clear();
    await tx.done;
  }
};
