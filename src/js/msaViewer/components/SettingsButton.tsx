/**
 * Settings button component for AlignmentViewer
 */

import React from 'react';
import { SettingsButtonProps } from '../types';
import { settingsButtonContainerStyles, settingsButtonStyles } from '../styles';

export function SettingsButton({ showSettings, onToggleSettings }: SettingsButtonProps) {
  return (
    <div style={settingsButtonContainerStyles}>
      {!showSettings && (
        <button
          onClick={onToggleSettings}
          style={settingsButtonStyles}
          title="Show Settings"
        >
          Settings
        </button>
      )}
    </div>
  );
}