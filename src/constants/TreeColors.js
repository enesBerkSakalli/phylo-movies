// Default system colors that shouldn't be overridden by taxon names
export const SYSTEM_COLOR_DEFAULTS = {
  defaultColor: "#000000",
  markedColor: "#10b981",
  strokeColor: "#000000",
  pivotEdgeColor: "#2196f3"
};

// Runtime container for system-level tree colors only.
// Do not add individual taxon names to this object.
export const SYSTEM_TREE_COLORS = { ...SYSTEM_COLOR_DEFAULTS };
