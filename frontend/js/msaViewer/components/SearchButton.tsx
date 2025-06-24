/**
 * Search button component for AlignmentViewer
 */

import React from 'react';
import { SearchButtonProps } from '../types';
import { settingsButtonStyles } from '../styles';

export function SearchButton({ triggerShowSearch }: SearchButtonProps) {
  return (
    <div style={{
      position: "absolute",
      top: "8px",
      right: "72px",
      zIndex: 1000
    }}>
      <button
        style={{
          ...settingsButtonStyles,
          background: "#28a745"
        }}
        type="button"
        title="Show Search"
        onClick={() => {
          if (triggerShowSearch.current) triggerShowSearch.current();
        }}
      >
        Search
      </button>
    </div>
  );
}