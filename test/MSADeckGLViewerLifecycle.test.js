import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { MSADeckGLViewer } from '../src/msaViewer/MSADeckGLViewer.js';

function makeViewer() {
  const viewer = Object.create(MSADeckGLViewer.prototype);
  viewer._destroyed = false;
  viewer._postLoadRenderTimeoutId = null;
  viewer.frame = null;
  viewer.resizeObserver = null;
  viewer.container = null;
  viewer.canvas = null;
  viewer.state = {
    deckgl: null,
    seqs: [],
    rows: 0,
    cols: 0,
    selection: null,
    viewState: { target: [0, 0, 0], zoom: 0 }
  };
  viewer.adjustLabelWidth = vi.fn();
  viewer.initCameraPosition = vi.fn();
  viewer.render = vi.fn();
  return viewer;
}

describe('MSADeckGLViewer lifecycle', () => {
  it('does not carry standalone viewer or minimap leftovers', () => {
    const source = readFileSync(new URL('../src/msaViewer/MSADeckGLViewer.js', import.meta.url), 'utf8');
    const config = readFileSync(new URL('../src/msaViewer/config.js', import.meta.url), 'utf8');

    expect(source).not.toContain('msa_viewer.html');
    expect(source).not.toContain('WinBox');
    expect(source).not.toContain('buildMinimapCellsLayer');
    expect(source).not.toContain('resetCamera()');
    expect(config).not.toContain('MINIMAP_MAX_CELLS');
  });

  it('does not delay initial deck setup with a fixed timer', () => {
    const source = readFileSync(new URL('../src/msaViewer/MSADeckGLViewer.js', import.meta.url), 'utf8');
    const config = readFileSync(new URL('../src/msaViewer/config.js', import.meta.url), 'utf8');

    expect(source).not.toContain('_initTimeoutId');
    expect(source).not.toContain('setTimeout(() => this.initializeDeck()');
    expect(config).not.toContain('INIT_DELAY_MS');
  });

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

  it('centers one-based MSA regions through the public region scroll API', () => {
    const viewer = makeViewer();
    viewer.state.seqs = [{ id: 'taxon-a', seq: 'ACGT' }];
    viewer.state.rows = 1;
    viewer.state.cols = 10;
    viewer.options = { cellSize: 12 };
    viewer.scrollTo = vi.fn();

    viewer.scrollToRegion(2, 4, { align: 'center' });

    expect(viewer.scrollTo).toHaveBeenCalledWith({ col: 2.5 });
  });
});
