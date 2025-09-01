// MSA Viewer constants: UI strings, CSS class names, defaults

export const CLASS = {
  container: 'msa-container',
  controls: 'msa-controls',
  rendererContainer: 'msa-renderer-container',
  regionControls: 'msa-region-controls',
  label: 'msa-label',
  toLabel: 'msa-to-label',
  input: 'msa-input',
  button: 'msa-button',
  buttonSet: 'msa-button--set',
  buttonClear: 'msa-button--clear',
  winbox: 'msa-winbox',
  winboxNoFull: 'no-full',
};

export const UI = {
  windowTitle: 'MSA Viewer',
  labelRegion: 'Region:',
  labelTo: 'to',
  buttonSet: 'Set',
  buttonClear: 'Clear',
};

export const DEFAULTS = {
  renderer: {
    cellSize: 16,
    showLetters: true,
    MAX_CELLS: 150000,
  },
  window: {
    width: '70%',
    height: '60%',
    border: 2,
  }
};

