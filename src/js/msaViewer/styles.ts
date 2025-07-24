/**
 * Styles for AlignmentViewer2Component
 */

import React from 'react';

export const containerStyles: React.CSSProperties = {
  width: "100%",
  height: "100%",
  background: "var(--md-sys-color-surface, #fff)",
  borderRadius: "var(--md-sys-shape-corner-medium, 8px)",
  overflow: "hidden",
  margin: 0,
  padding: 0,
  display: "flex",
  flexDirection: "column",
  position: "relative",
};

export const settingsButtonContainerStyles: React.CSSProperties = {
  position: "absolute",
  top: "var(--md-sys-spacing-small, 8px)",
  right: "var(--md-sys-spacing-small, 8px)",
  zIndex: 1000
};

export const settingsButtonStyles: React.CSSProperties = {
  padding: "var(--md-sys-spacing-xsmall, 4px) var(--md-sys-spacing-small, 8px)",
  background: "var(--md-sys-color-primary, #007bff)",
  color: "var(--md-sys-color-on-primary, #fff)",
  border: "none",
  borderRadius: "var(--md-sys-shape-corner-small, 4px)",
  cursor: "pointer",
  fontSize: "var(--md-sys-typescale-label-small-size, 12px)"
};

export const settingsPanelStyles: React.CSSProperties = {
  position: "absolute",
  top: "var(--md-sys-spacing-small, 8px)",
  right: "var(--md-sys-spacing-small, 8px)",
  zIndex: 1000,
  background: "var(--md-sys-color-surface, #fff)",
  border: "1px solid var(--md-sys-color-outline, #ccc)",
  borderRadius: "var(--md-sys-shape-corner-small, 4px)",
  boxShadow: "var(--md-sys-elevation-level2, 0 2px 8px rgba(0,0,0,0.1))",
  maxHeight: "80vh",
};

export const appContentStyles: React.CSSProperties = {
  width: "100%",
  height: "100%",
  position: "relative",
  flex: 1,
  overflow: "visible"
};
