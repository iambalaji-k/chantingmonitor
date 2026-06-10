import React, { useState, useRef } from 'react';
import { useChanting } from '../context/ChantingContext';
import { Download, Upload, Trash2, Smartphone, SunMoon } from 'lucide-react';

export const SettingsPanel: React.FC = () => {
  const {
    dailyGoal,
    hapticEnabled,
    theme,
    setGoal,
    setHaptic,
    setThemePreference,
    resetAllUserData,
    exportData,
    importData,
  } = useChanting();

  const [customGoal, setCustomGoal] = useState<string>(dailyGoal.toString());
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });

  const handleGoalPreset = (val: number) => {
    setGoal(val);
    setCustomGoal(val.toString());
  };

  const handleCustomGoalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCustomGoal(val);
    const parsed = parseInt(val, 10);
    if (!isNaN(parsed) && parsed > 0) {
      setGoal(parsed);
    }
  };

  const handleExport = async () => {
    try {
      const json = await exportData();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const dateStr = new Date().toISOString().split('T')[0];
      link.href = url;
      link.download = `chanting_monitor_backup_${dateStr}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export data:', err);
    }
  };

  const handleImportClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const content = evt.target?.result as string;
      if (!content) return;
      
      const success = await importData(content);
      if (success) {
        setImportStatus({ type: 'success', message: 'Data imported successfully!' });
        setTimeout(() => setImportStatus({ type: null, message: '' }), 4000);
      } else {
        setImportStatus({ type: 'error', message: 'Invalid file format. Import failed.' });
        setTimeout(() => setImportStatus({ type: null, message: '' }), 4000);
      }
    };
    reader.readAsText(file);
    // Reset file input value
    e.target.value = '';
  };

  const handleResetData = async () => {
    await resetAllUserData();
    setIsResetModalOpen(false);
  };

  return (
    <div className="settings-section animate-fade-in">
      <div className="settings-card">
        {/* Daily Goal Settings */}
        <div className="settings-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '12px' }}>
          <div className="settings-info">
            <span className="settings-title">Daily Goal (Rounds)</span>
            <span className="settings-desc">Target rounds to complete each day</span>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="goal-presets">
              {[4, 8, 16, 32].map((preset) => (
                <button
                  key={preset}
                  className={`goal-preset-btn ${dailyGoal === preset ? 'active' : ''}`}
                  onClick={() => handleGoalPreset(preset)}
                >
                  {preset}
                </button>
              ))}
            </div>
            
            <div className="custom-goal-input-container">
              <span className="settings-desc" style={{ fontWeight: '600' }}>Custom:</span>
              <input
                type="number"
                pattern="[0-9]*"
                className="custom-goal-input"
                value={customGoal}
                onChange={handleCustomGoalChange}
                min="1"
                max="999"
              />
            </div>
          </div>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)' }} />

        {/* Haptic Toggle */}
        <div className="settings-row">
          <div className="settings-info" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '10px' }}>
            <Smartphone size={18} strokeWidth={1.5} color="var(--accent-saffron)" />
            <div className="settings-info">
              <span className="settings-title">Haptic Feedback</span>
              <span className="settings-desc">Vibrate on round completion</span>
            </div>
          </div>
          
          <label className="switch-control">
            <input
              type="checkbox"
              checked={hapticEnabled}
              onChange={(e) => setHaptic(e.target.checked)}
            />
            <span className="switch-slider"></span>
          </label>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)' }} />

        {/* Theme Settings */}
        <div className="settings-row">
          <div className="settings-info" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '10px' }}>
            <SunMoon size={18} strokeWidth={1.5} color="var(--accent-saffron)" />
            <div className="settings-info">
              <span className="settings-title">Visual Theme</span>
              <span className="settings-desc">Select visual appearance style</span>
            </div>
          </div>

          <div className="theme-selector">
            <button
              className={`theme-btn ${theme === 'dark' ? 'active' : ''}`}
              onClick={() => setThemePreference('dark')}
            >
              Dark
            </button>
            <button
              className={`theme-btn ${theme === 'light' ? 'active' : ''}`}
              onClick={() => setThemePreference('light')}
            >
              Light
            </button>
          </div>
        </div>
      </div>

      {/* Backup and Storage Section */}
      <div className="settings-card">
        <span className="summary-list-title">Data Backup & Recovery</span>
        
        <div className="action-buttons-group">
          <button className="btn-action-outline" onClick={handleExport}>
            <Download size={16} />
            Export Data (Backup JSON)
          </button>

          <button className="btn-action-outline" onClick={handleImportClick}>
            <Upload size={16} />
            Import Data (Restore JSON)
          </button>
          <input
            type="file"
            accept=".json"
            ref={fileInputRef}
            onChange={handleImportFile}
            style={{ display: 'none' }}
          />

          {importStatus.type && (
            <div
              style={{
                fontSize: '12px',
                textAlign: 'center',
                padding: '6px',
                borderRadius: '8px',
                backgroundColor: importStatus.type === 'success' ? 'rgba(46, 204, 113, 0.1)' : 'rgba(231, 76, 60, 0.1)',
                color: importStatus.type === 'success' ? '#2ecc71' : '#e74c3c',
                fontWeight: '600'
              }}
            >
              {importStatus.message}
            </div>
          )}
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)' }} />

        <div className="action-buttons-group">
          <button className="btn-danger-outline" onClick={() => setIsResetModalOpen(true)}>
            <Trash2 size={16} />
            Reset All Application Data
          </button>
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      <div className={`modal-overlay ${isResetModalOpen ? 'open' : ''}`} onClick={() => setIsResetModalOpen(false)}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <span className="modal-title">Reset All Data?</span>
          <p className="modal-desc">
            This action will permanently delete all your chanting stats, daily goal records, themes, active sessions, and settings. This action is irreversible.
          </p>
          <div className="modal-actions">
            <button className="btn-modal-cancel" onClick={() => setIsResetModalOpen(false)}>
              Cancel
            </button>
            <button className="btn-modal-confirm" onClick={handleResetData}>
              Reset Data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
