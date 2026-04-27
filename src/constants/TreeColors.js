// Default system colors that shouldn't be overridden by taxon names
export const SYSTEM_COLOR_DEFAULTS = {
  defaultColor: "#000000",
  markedColor: "#10b981",
  strokeColor: "#000000",
  pivotEdgeColor: "#2196f3"
};

/**
 * TREE_COLOR_CATEGORIES is kept for backward compatibility and as a runtime
 * container for system-level colors only.
 * STOP adding individual taxon names to this object.
 */
export const TREE_COLOR_CATEGORIES = { ...SYSTEM_COLOR_DEFAULTS };
