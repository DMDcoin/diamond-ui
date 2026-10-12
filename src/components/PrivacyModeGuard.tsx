'use client';

import React, { memo } from 'react';
import { useIsPrivacyMode } from '@/contexts/PrivacyMode';
import type { PrivacyModeGuardProps } from '@/types/privacyMode';
import './PrivacyModeGuard.css';

/**
 * Privacy Mode Guard Component
 * Wraps children to show/hide content based on privacy mode
 */
const PrivacyModeGuard = memo(function PrivacyModeGuard({
  children,
  fallback,
  placeholder = 'hidden',
  customPlaceholder,
  label = 'API Data Hidden',
  className = '',
}: PrivacyModeGuardProps) {
  const isPrivacyMode = useIsPrivacyMode();

  // If privacy mode is OFF, render children normally
  if (!isPrivacyMode) {
    return <>{children}</>;
  }

  // Privacy mode is ON - render fallback or placeholder

  // If fallback is provided, use it
  if (fallback) {
    return <>{fallback}</>;
  }

  // If custom placeholder is provided with 'custom' type
  if (placeholder === 'custom' && customPlaceholder) {
    return <>{customPlaceholder}</>;
  }

  // Render built-in placeholder based on type
  switch (placeholder) {
    case 'skeleton':
      return (
        <div className={`privacy-guard-placeholder skeleton ${className}`} title={label}>
          <div className="skeleton-content">
            <div className="skeleton-line"></div>
            <div className="skeleton-line short"></div>
            <div className="skeleton-line"></div>
          </div>
        </div>
      );

    case 'blur':
      return (
        <div className={`privacy-guard-placeholder blur ${className}`} title={label}>
          <div className="blur-content">
            {children}
          </div>
          <div className="blur-overlay">
            <span className="blur-badge">
              <i className="fas fa-lock"></i> {label}
            </span>
          </div>
        </div>
      );

    case 'redacted':
      return (
        <div className={`privacy-guard-placeholder redacted ${className}`} title={label}>
          <span className="redacted-badge">
            <i className="fas fa-eye-slash"></i> [REDACTED]
          </span>
        </div>
      );

    case 'hidden':
    default:
      // Return null - completely hide the content
      return null;
  }
});

// Set display name for debugging
PrivacyModeGuard.displayName = 'PrivacyModeGuard';

export default PrivacyModeGuard;
