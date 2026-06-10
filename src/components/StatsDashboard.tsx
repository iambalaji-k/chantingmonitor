import React, { useState, useEffect } from 'react';
import { db } from '../utils/db';
import type { DailyStat } from '../utils/db';
import { useChanting } from '../context/ChantingContext';
import { BarChart2, Flame, Award } from 'lucide-react';

export const StatsDashboard: React.FC = () => {
  const { dailyGoal } = useChanting();
  const [stats, setStats] = useState<DailyStat[]>([]);
  const [loading, setLoading] = useState(true);

  // Load stats on mount
  useEffect(() => {
    const loadStats = async () => {
      try {
        const data = await db.getAllStats();
        setStats(data);
      } catch (err) {
        console.error('Failed to load stats:', err);
      } finally {
        setLoading(false);
      }
    };
    loadStats();
  }, []);

  const formatDuration = (seconds: number) => {
    if (seconds <= 0) return '0s';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `${hrs}h ${mins}m`;
    }
    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  };

  const getDayName = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    } catch {
      return dateStr;
    }
  };

  const getFormattedDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  // Streaks calculation logic
  const calculateStreaks = (allStats: DailyStat[]) => {
    if (allStats.length === 0) return { current: 0, longest: 0 };

    // Sort stats by date ascending
    const sorted = [...allStats].sort((a, b) => a.date.localeCompare(b.date));
    
    // Map dates to rounds
    const statsMap = new Map<string, number>();
    sorted.forEach(s => statsMap.set(s.date, s.rounds));

    // Helper to format date
    const formatDate = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    // Calculate current streak
    let currentStreak = 0;
    const today = new Date();
    const todayStr = formatDate(today);
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = formatDate(yesterday);

    let streakDate = today;
    let hasChantedToday = (statsMap.get(todayStr) || 0) > 0;
    let hasChantedYesterday = (statsMap.get(yesterdayStr) || 0) > 0;

    if (hasChantedToday) {
      currentStreak = 1;
      streakDate = today;
      // Go backwards
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
      streakDate = yesterday;
      // Go backwards
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

    // Calculate longest streak in retained data
    let longestStreak = 0;
    let runningStreak = 0;
    
    // Sort dates properly to check gaps
    if (sorted.length > 0) {
      const firstDate = new Date(sorted[0].date);
      const lastDate = new Date(sorted[sorted.length - 1].date);
      let tempDate = new Date(firstDate);

      while (tempDate <= lastDate) {
        const dStr = formatDate(tempDate);
        const rounds = statsMap.get(dStr) || 0;
        
        if (rounds > 0) {
          runningStreak++;
          longestStreak = Math.max(longestStreak, runningStreak);
        } else {
          runningStreak = 0;
        }
        tempDate.setDate(tempDate.getDate() + 1);
      }
    }

    return { current: currentStreak, longest: longestStreak };
  };

  // Stats summaries
  const todayKey = new Date().toISOString().split('T')[0];
  const todayStat = stats.find(s => s.date === todayKey) || { date: todayKey, rounds: 0, seconds: 0 };
  const todayProgressPct = Math.min(100, Math.round((todayStat.rounds / dailyGoal) * 100));

  const totalRounds = stats.reduce((sum, s) => sum + s.rounds, 0);
  const totalSeconds = stats.reduce((sum, s) => sum + s.seconds, 0);
  const daysRecordedCount = stats.length || 1;

  const avgRoundsPerDay = (totalRounds / daysRecordedCount).toFixed(1);
  const avgChantingTimePerDay = Math.round(totalSeconds / daysRecordedCount);
  const avgTimePerRound = totalRounds > 0 ? Math.round(totalSeconds / totalRounds) : 0;

  const streaks = calculateStreaks(stats);

  // SVG Chart Dimensions
  const chartWidth = 360;
  const chartHeight = 160;
  const paddingLeft = 25;
  const paddingRight = 15;
  const paddingTop = 25;
  const paddingBottom = 20;

  const graphWidth = chartWidth - paddingLeft - paddingRight;
  const graphHeight = chartHeight - paddingTop - paddingBottom;

  const maxVal = Math.max(...stats.map(s => s.rounds), dailyGoal, 1);
  const yAxisTicks = [0, Math.round(maxVal / 2), maxVal];

  return (
    <div className="stats-header-row animate-fade-in">
      {loading ? (
        <div className="loading-screen">
          <div className="spinner"></div>
          <span>Loading Statistics...</span>
        </div>
      ) : (
        <>
          {/* Today's Summary Card */}
          <div className="stats-grid-2x2">
            <div className="stats-card-mini">
              <div className="stat-label">Rounds Today</div>
              <div className="stats-card-mini-value font-serif">
                {todayStat.rounds} <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>/ {dailyGoal}</span>
              </div>
            </div>

            <div className="stats-card-mini">
              <div className="stat-label">Time Today</div>
              <div className="stats-card-mini-value">
                {formatDuration(todayStat.seconds)}
              </div>
            </div>

            <div className="stats-card-mini">
              <div className="stat-label">Goal Met</div>
              <div className="stats-card-mini-value" style={{ color: todayProgressPct >= 100 ? 'var(--accent-gold)' : 'var(--accent-saffron)' }}>
                {todayProgressPct}%
              </div>
            </div>

            <div className="stats-card-mini">
              <div className="stat-label">Current Streak</div>
              <div className="stats-card-mini-value" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Flame size={18} fill="var(--accent-saffron)" stroke="var(--accent-saffron)" />
                {streaks.current} {streaks.current === 1 ? 'Day' : 'Days'}
              </div>
            </div>
          </div>

          {/* Bar Chart Container */}
          <div className="chart-container">
            <div className="chart-title">7-Day Round History</div>
            {stats.length === 0 ? (
              <div className="empty-chart-state">
                <BarChart2 size={32} strokeWidth={1.5} />
                <span>No chanting records found yet.</span>
              </div>
            ) : (
              <svg className="bar-chart-svg" viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
                {/* Horizontal grid lines */}
                {yAxisTicks.map((tick, index) => {
                  const y = paddingTop + graphHeight - (tick / maxVal) * graphHeight;
                  return (
                    <g key={index}>
                      <line
                        x1={paddingLeft}
                        y1={y}
                        x2={chartWidth - paddingRight}
                        y2={y}
                        stroke="var(--border-color)"
                        strokeWidth="0.5"
                        strokeDasharray="3 3"
                      />
                      <text
                        x={paddingLeft - 6}
                        y={y + 3}
                        fontFamily="var(--font-sans)"
                        fontSize="8px"
                        fontWeight="600"
                        fill="var(--text-secondary)"
                        textAnchor="end"
                      >
                        {tick}
                      </text>
                    </g>
                  );
                })}

                {/* Bars */}
                {stats.map((stat, i) => {
                  const barWidth = 22;
                  const spacing = graphWidth / stats.length;
                  const x = paddingLeft + i * spacing + (spacing - barWidth) / 2;
                  
                  const barHeight = (stat.rounds / maxVal) * graphHeight;
                  const y = paddingTop + graphHeight - barHeight;
                  const isToday = stat.date === todayKey;

                  return (
                    <g key={stat.date} className={`bar-chart-group ${isToday ? 'active' : ''}`}>
                      {/* Interactive hover tooltip value */}
                      <text
                        x={x + barWidth / 2}
                        y={y - 6}
                        className="bar-val-text"
                      >
                        {stat.rounds}
                      </text>
                      
                      {/* Bar Rectangle */}
                      <rect
                        x={x}
                        y={y}
                        width={barWidth}
                        height={Math.max(barHeight, 2)}
                        className="bar-rect"
                      />

                      {/* Day Label */}
                      <text
                        x={x + barWidth / 2}
                        y={chartHeight - 4}
                        className="bar-text"
                      >
                        {getDayName(stat.date)}
                      </text>
                    </g>
                  );
                })}
              </svg>
            )}
          </div>

          {/* 7-Day Summary Metrics Card */}
          <div className="summary-list-card" style={{ marginBottom: '24px' }}>
            <div className="summary-list-title">7-Day Performance</div>
            
            <div className="summary-row">
              <span className="summary-date">Daily Average Rounds</span>
              <span className="summary-rounds" style={{ color: 'var(--text-primary)' }}>{avgRoundsPerDay}</span>
            </div>

            <div className="summary-row">
              <span className="summary-date">Daily Average Duration</span>
              <span className="summary-rounds" style={{ color: 'var(--text-primary)' }}>{formatDuration(avgChantingTimePerDay)}</span>
            </div>

            <div className="summary-row">
              <span className="summary-date">Average Time per Round</span>
              <span className="summary-rounds" style={{ color: 'var(--text-primary)' }}>{formatDuration(avgTimePerRound)}</span>
            </div>

            <div className="summary-row">
              <span className="summary-date">Longest Streak</span>
              <span className="summary-rounds" style={{ color: 'var(--accent-gold)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Award size={14} fill="var(--accent-gold)" />
                {streaks.longest} {streaks.longest === 1 ? 'Day' : 'Days'}
              </span>
            </div>
          </div>

          {/* Daily log list */}
          <div className="summary-list-card">
            <div className="summary-list-title">Daily Activity Log</div>
            {stats.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '10px 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                No records yet.
              </div>
            ) : (
              [...stats].reverse().map((stat) => (
                <div className="summary-row" key={stat.date}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span className="summary-date">{getFormattedDate(stat.date)}</span>
                    <span className="summary-time">{formatDuration(stat.seconds)} chanted</span>
                  </div>
                  <span className="summary-rounds">
                    {stat.rounds} {stat.rounds === 1 ? 'round' : 'rounds'}
                  </span>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
};
