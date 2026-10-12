'use client';

/**
 * Privacy Mode Indicator/Toggle Component
 */

import React from 'react';
import { usePrivacyMode } from '@/contexts/PrivacyMode';
import './PrivacyModeIndicator.css';

export default function PrivacyModeIndicator() {
  const { isPrivacyMode, togglePrivacyMode } = usePrivacyMode();

  return (
    <div className="privacy-mode-wrapper">
      <button
        className={`privacy-mode-toggle ${isPrivacyMode ? 'active' : ''}`}
        onClick={togglePrivacyMode}
        title={
          isPrivacyMode
            ? 'Privacy Mode: ON - Only blockchain data'
            : 'Privacy Mode: OFF - API + blockchain data'
        }
        aria-label={isPrivacyMode ? 'Disable Privacy Mode' : 'Enable Privacy Mode'}
      >
        <span className="privacy-icon">
          {isPrivacyMode ? (
            <i className="fas fa-shield-alt"></i>
          ) : (
            <i className="fas fa-globe"></i>
          )}
        </span>
        <span className="privacy-label">
          {isPrivacyMode ? 'Blockchain Only' : 'Normal Mode'}
        </span>
      </button>
      
      {isPrivacyMode && (
        <div className="privacy-mode-badge">
          <i className="fas fa-lock"></i>
        </div>
      )}
    </div>
  );
}
