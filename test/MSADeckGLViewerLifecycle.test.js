import { describe, expect, it, vi } from 'vitest';
import { MSADeckGLViewer } from '../src/msaViewer/MSADeckGLViewer.js';

function makeViewer() {
  const viewer = Object.create(MSADeckGLViewer.prototype);
  viewer._destroyed = false;
  viewer._initTimeoutId = null;
  viewer._postLoadRenderTimeoutId = null;
  viewer.frame = null;
  viewer.resizeObserver = null;
  viewer.container = null;
  viewer.canvas = null;
  viewer.state = {
    deckgl: null,
    seqs: [],
    cols: 0,
    selection: null
  };
  viewer.adjustLabelWidth = vi.fn();
  viewer.initCameraPosition = vi.fn();
  viewer.render = vi.fn();
  return viewer;
}

describe('MSADeckGLViewer lifecycle', () => {
  it('cancels the delayed post-load render on destroy', () => {
    vi.useFakeTimers();
    const viewer = makeViewer();

    viewer._applyProcessedData({
      sequences: [
        { id: 'taxon-a', seq: 'ACGT' },
        { id: 'taxon-b', seq: 'ACGA' }
      ],
      type: 'dna',
      rows: 2,
      cols: 4
    });

    expect(viewer.render).toHaveBeenCalledTimes(1);
    expect(viewer._postLoadRenderTimeoutId).not.toBeNull();

    viewer.destroy();
    vi.advanceTimersByTime(100);

    expect(viewer.render).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});
