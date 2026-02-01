export const DEFAULT_MSA_VIEWER_OPTIONS = {
  MAX_CELLS: 150_000,
  MINIMAP_MAX_CELLS: 5000,
  cellSize: 12, // High-density default (67% feel)
  showLetters: true,
  colorScheme: 'default',
  rowColorMap: {}
};

export const MSA_VIEWER_CONSTANTS = {
  DEFAULT_LABELS_WIDTH: 20,
  AXIS_HEIGHT: 20,   // Proportionate height for 10px cells
  MIN_ZOOM: -8,
  MAX_ZOOM: 10,
  INIT_DELAY_MS: 50
};
