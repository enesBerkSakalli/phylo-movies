/**
 * Styles for AlignmentViewer2Component
 */

import React from 'react';

export const containerStyles: React.CSSProperties = {
  width: "100%",
  height: "100%",
  background: "#fff",
  borderRadius: "8px",
  overflow: "hidden",
  margin: 0,
  padding: 0,
  display: "flex",
  flexDirection: "column",
  position: "relative",
};

export const settingsButtonContainerStyles: React.CSSProperties = {
  position: "absolute",
  top: "8px",
  right: "8px",
  zIndex: 1000
};

export const settingsButtonStyles: React.CSSProperties = {
  padding: "4px 8px",
  background: "#007bff",
  color: "white",
  border: "none",
  borderRadius: "4px",
  cursor: "pointer",
  fontSize: "12px"
};

export const settingsPanelStyles: React.CSSProperties = {
  position: "absolute",
  top: "8px",
  right: "8px",
  zIndex: 1000,
  background: "white",
  border: "1px solid #ccc",
  borderRadius: "4px",
  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
  maxHeight: "80vh",
};

export const appContentStyles: React.CSSProperties = {
  width: "100%",
  height: "100%",
  position: "relative",
  flex: 1,
  overflow: "visible"
};