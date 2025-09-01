import MSAViewer from './MSAViewer.js';

/**
 * Open the MSA viewer window with optional data and options.
 * @param {object} data - Phylo data containing `msa`.
 * @param {object} [options] - Optional settings { onClose }
 * @returns {MSAViewer} The viewer instance for further control.
 */
let _viewer = null;
let _initializing = null;
// Queue region operations if called before the viewer is created
let _pendingRegion = null; // { start, end } or null
let _pendingClear = false;

export async function showMSAViewer(data, options = {}) {
  // Check if viewer exists but window was closed
  if (_viewer && _viewer.winBoxInstance && !_viewer.winBoxInstance.dom) {
    // Window was closed, reset the viewer
    _viewer = null;
    _initializing = null;
  }
  
  // Reuse a single viewer instance
  if (!_viewer && !_initializing) {
    // Wrap the onClose callback to reset the viewer reference
    const originalOnClose = options.onClose;
    const wrappedOnClose = () => {
      _viewer = null;
      _initializing = null;
      if (originalOnClose) originalOnClose();
    };
    
    _viewer = new MSAViewer(wrappedOnClose);
    _initializing = _viewer.ready.finally(() => { _initializing = null; });
  }

  // Ensure initialization completes
  if (_initializing) {
    await _initializing;
  }

  if (data) {
    _viewer.loadData(data);
  }

  // Apply any pending region operations queued before viewer creation
  if (_pendingClear) {
    _viewer.clearRegion();
    _pendingClear = false;
    _pendingRegion = null;
  } else if (_pendingRegion) {
    _viewer.setRegion(_pendingRegion.start, _pendingRegion.end);
    _pendingRegion = null;
  }

  // Bring to front if available
  _viewer?.show?.();
  return _viewer;
}

export default showMSAViewer;

/**
 * Programmatic API to set the MSA region if the viewer exists.
 * Returns true if a viewer is available and the call was queued/applied.
 */
export async function setMSARegion(start, end) {
  if (!_viewer) {
    // Queue until the viewer is created via showMSAViewer
    _pendingRegion = { start, end };
    _pendingClear = false;
    return true; // Indicate it was queued
  }
  if (_initializing) await _initializing;
  _viewer.setRegion(start, end);
  return true;
}

/**
 * Programmatic API to clear the MSA region if the viewer exists.
 * Returns true if a viewer is available and the call was queued/applied.
 */
export async function clearMSARegion() {
  if (!_viewer) {
    // Queue clear until the viewer is created via showMSAViewer
    _pendingRegion = null;
    _pendingClear = true;
    return true;
  }
  if (_initializing) await _initializing;
  _viewer.clearRegion();
  return true;
}
