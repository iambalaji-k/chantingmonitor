import React, { useState, useEffect } from 'react';
import { useChanting } from '../context/ChantingContext';
import { ScrollPicker } from './ScrollPicker';
import { X } from 'lucide-react';

interface ManualAdjusterProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ManualAdjuster: React.FC<ManualAdjusterProps> = ({ isOpen, onClose }) => {
  const { roundCount, currentBead, setBeadManually, setRoundsManually } = useChanting();
  const [selectedRounds, setSelectedRounds] = useState(roundCount);
  const [selectedBead, setSelectedBead] = useState(currentBead);

  // Sync state when drawer opens
  useEffect(() => {
    if (isOpen) {
      setSelectedRounds(roundCount);
      setSelectedBead(currentBead);
    }
  }, [isOpen, roundCount, currentBead]);

  const handleApply = () => {
    setRoundsManually(selectedRounds);
    setBeadManually(selectedBead);
    onClose();
  };

  return (
    <div className={`drawer-overlay ${isOpen ? 'open' : ''}`} onClick={onClose}>
      <div className="drawer-content" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-header">
          <span className="drawer-title">Manual Adjuster</span>
          <button className="btn-close" onClick={onClose} aria-label="Close drawer">
            <X size={20} />
          </button>
        </div>

        <div className="adjuster-wheel-container">
          <div className="adjuster-column">
            <span className="adjuster-column-label">Rounds</span>
            <ScrollPicker
              min={0}
              max={64}
              value={selectedRounds}
              onChange={setSelectedRounds}
            />
          </div>

          <div className="adjuster-column">
            <span className="adjuster-column-label">Bead</span>
            <ScrollPicker
              min={0}
              max={108}
              value={selectedBead}
              onChange={setSelectedBead}
            />
          </div>
        </div>

        <button className="btn-action-primary" onClick={handleApply}>
          Apply Changes
        </button>
      </div>
    </div>
  );
};
