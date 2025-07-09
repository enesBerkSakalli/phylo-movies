/**
 * Settings panel component for AlignmentViewer
 */

import React from 'react';
import { SettingsPanelProps } from '../types';
import { settingsPanelStyles } from '../styles';

export function SettingsPanel({ showSettings, settingsElement }: SettingsPanelProps) {
  if (!showSettings) return null;

  return (
    <div style={settingsPanelStyles}>
      {settingsElement}
    </div>
  );
}