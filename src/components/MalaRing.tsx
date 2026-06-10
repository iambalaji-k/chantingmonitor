import React from 'react';
import { useChanting } from '../context/ChantingContext';

export const MalaRing: React.FC = () => {
  const { currentBead, currentPhase, setBeadManually } = useChanting();

  const cx = 145;
  const cy = 145;
  const R = 122;
  const totalBeads = 108;

  const beads = [];
  for (let i = 1; i <= totalBeads; i++) {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / totalBeads;
    const x = cx + R * Math.cos(angle);
    const y = cy + R * Math.sin(angle);
    
    let isCompleted = false;
    let isActive = false;

    if (currentPhase === 'pranam2' || currentPhase === 'chime') {
      isCompleted = true;
    } else if (currentPhase === 'mantra') {
      if (i < currentBead) {
        isCompleted = true;
      } else if (i === currentBead) {
        isActive = true;
      }
    }

    beads.push({
      index: i,
      x,
      y,
      isCompleted,
      isActive,
    });
  }

  // Sumeru bead position at the top
  const sumeruX = cx;
  const sumeruY = cy - R;

  return (
    <div className="mala-ring-container">
      <svg className="mala-svg" viewBox="0 0 290 290">
        {/* Connection Thread Ring */}
        <circle
          cx={cx}
          cy={cy}
          r={R}
          fill="none"
          stroke="var(--border-color)"
          strokeWidth="0.5"
          strokeDasharray="2 3"
        />

        {/* Render 108 Beads */}
        {beads.map((bead) => (
          <circle
            key={bead.index}
            cx={bead.x}
            cy={bead.y}
            r={3.2}
            className={`mala-bead ${bead.isActive ? 'active' : ''} ${bead.isCompleted ? 'completed' : ''}`}
            onClick={() => setBeadManually(bead.index)}
          />
        ))}

        {/* Sumeru Bead (Guru Bead) at the top */}
        <circle
          cx={sumeruX}
          cy={sumeruY}
          r={6.5}
          fill="var(--accent-gold)"
          stroke="var(--accent-saffron)"
          strokeWidth="1.5"
          style={{
            filter: 'drop-shadow(0 0 5px rgba(243, 156, 18, 0.8))',
            cursor: 'pointer',
          }}
          onClick={() => setBeadManually(0)}
        />
        
        {/* Tiny tassel hanger below Sumeru */}
        <line
          x1={sumeruX}
          y1={sumeruY - 6.5}
          x2={sumeruX}
          y2={sumeruY - 12}
          stroke="var(--accent-saffron)"
          strokeWidth="1.5"
        />
      </svg>
      
      {/* Central Mantra Card */}
      <div className={`center-mantra-card ${currentPhase === 'mantra' ? 'glowing' : ''}`}>
        {currentPhase === 'pranam1' && (
          <div className="mantra-text font-serif" style={{ fontSize: '9px', lineHeight: '1.45', fontStyle: 'italic', opacity: 0.9 }}>
            sri-krishna-caitanya<br/>
            prabhu-nityananda<br/>
            sri-advaita gadadhara<br/>
            srivasadi-gaura-bhakta-vrinda
          </div>
        )}

        {currentPhase === 'pranam2' && (
          <div className="mantra-text font-serif" style={{ fontSize: '9px', lineHeight: '1.45', fontStyle: 'italic', opacity: 0.9 }}>
            sri-krishna-caitanya<br/>
            prabhu-nityananda<br/>
            sri-advaita gadadhara<br/>
            srivasadi-gaura-bhakta-vrinda
          </div>
        )}

        {currentPhase === 'chime' && (
          <div className="bead-counter-display font-serif" style={{ fontSize: '36px', margin: '0' }}>
            🔔
          </div>
        )}

        {currentPhase === 'mantra' && (
          <div className="mantra-text font-serif" style={{ fontSize: '10px', lineHeight: '1.5', letterSpacing: '0.2px', color: 'var(--text-primary)' }}>
            Hare Krishna Hare Krishna<br/>
            Krishna Krishna Hare Hare<br/>
            Hare Rama Hare Rama<br/>
            Rama Rama Hare Hare
          </div>
        )}
      </div>
    </div>
  );
};
