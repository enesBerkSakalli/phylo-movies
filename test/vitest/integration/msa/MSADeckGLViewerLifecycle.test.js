import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { MSADeckGLViewer } from '../../../../src/msaViewer/MSADeckGLViewer.js';

function makeViewer() {
  const viewer = Object.create(MSADeckGLViewer.prototype);
  viewer._destroyed = false;
  viewer.frame = null;
  viewer._renderedRange = null;
  viewer._cellGroupsCache = null;
  viewer.resizeObserver = null;
  viewer.container = null;
  viewer.canvas = null;
  viewer.options = {
    cellSize: 12,
    showLetters: true,
    colorScheme: 'default',
    rowColorMap: {},
  };
  viewer.state = {
    deckgl: null,
    seqs: [],
    type: 'protein',
    rows: 0,
    cols: 0,
    consensus: null,
    currentRegion: null,
    previousRegion: null,
    viewState: { target: [0, 0, 0], zoom: 0 },
  };
  viewer.adjustLabelWidth = vi.fn();
  viewer.initCameraPosition = vi.fn();
  viewer.render = vi.fn();
  return viewer;
}

describe('MSADeckGLViewer lifecycle', () => {
  it('does not carry standalone viewer or minimap leftovers', () => {
    const source = readFileSync(
      new URL('../../../../src/msaViewer/MSADeckGLViewer.js', import.meta.url),
      'utf8'
    );
    const config = readFileSync(
      new URL('../../../../src/msaViewer/config.js', import.meta.url),
      'utf8'
    );

    expect(source).not.toContain('msa_viewer.html');
    expect(source).not.toContain('WinBox');
    expect(source).not.toContain('buildMinimapCellsLayer');
    expect(source).not.toContain('resetCamera()');
    expect(config).not.toContain('MINIMAP_MAX_CELLS');
  });

  it('does not delay initial deck setup with a fixed timer', () => {
    const source = readFileSync(
      new URL('../../../../src/msaViewer/MSADeckGLViewer.js', import.meta.url),
      'utf8'
    );
    const config = readFileSync(
      new URL('../../../../src/msaViewer/config.js', import.meta.url),
      'utf8'
    );

    expect(source).not.toContain('_initTimeoutId');
    expect(source).not.toContain('setTimeout(() => this.initializeDeck()');
    expect(config).not.toContain('INIT_DELAY_MS');
  });

  it('attaches custom controller options to the main MSA view', () => {
    const viewer = makeViewer();
    viewer.container = { clientWidth: 800, clientHeight: 500 };
    viewer.LABELS_WIDTH = 100;
    viewer.AXIS_HEIGHT = 20;

    const mainView = viewer.buildDeckViews().find((view) => view.id === 'main');

    expect(mainView).toBeDefined();
    expect(mainView.props.controller).toMatchObject({
      dragPan: true,
      scrollZoom: false,
      doubleClickZoom: false,
      keyboard: { zoomSpeed: 0.08 },
    });
  });

  it('updates data, presentation, and regions in one render', () => {
    const viewer = makeViewer();

    viewer.update({
      data: {
        sequences: [
          { id: 'taxon-a', seq: 'ACGT' },
          { id: 'taxon-b', seq: 'ACGA' },
        ],
        consensus: 'ACGA',
        type: 'dna',
        rows: 2,
        cols: 4,
      },
      currentRegion: { start: 1, end: 2 },
      previousRegion: { start: 3, end: 4 },
      showLetters: false,
      colorScheme: 'identity',
      rowColorMap: { 'taxon-a': '#123456' },
    });

    expect(viewer.render).toHaveBeenCalledTimes(1);
    expect(viewer.state.currentRegion).toEqual({ startCol: 1, endCol: 2 });
    expect(viewer.state.previousRegion).toEqual({ startCol: 3, endCol: 4 });
    expect(viewer.state.consensus).toBe('ACGA');
    expect(viewer.options).toMatchObject({
      showLetters: false,
      colorScheme: 'identity',
      rowColorMap: { 'taxon-a': '#123456' },
    });
  });

  it('defers first camera initialization until deck and container layout are ready', () => {
    const viewer = makeViewer();
    viewer.hasUsableContainerSize = vi.fn(() => false);

    viewer.update({
      data: {
        sequences: [{ id: 'taxon-a', seq: 'ACGT' }],
        type: 'dna',
        rows: 1,
        cols: 4,
      },
    });

    expect(viewer.initCameraPosition).not.toHaveBeenCalled();
    expect(viewer._hasLoadedOnce).not.toBe(true);
  });

  it('centers one-based MSA regions through the canonical region command', () => {
    const viewer = makeViewer();
    viewer.state.seqs = [{ id: 'taxon-a', seq: 'ACGT' }];
    viewer.state.rows = 1;
    viewer.state.cols = 10;
    viewer.options = { cellSize: 12 };
    viewer.centerViewportOn = vi.fn();

    viewer.centerRegion(2, 4);

    expect(viewer.centerViewportOn).toHaveBeenCalledWith({ column: 2.5 });
  });

  it('does not expose compatibility method aliases', () => {
    expect(MSADeckGLViewer.prototype).not.toHaveProperty('setSelection');
    expect(MSADeckGLViewer.prototype).not.toHaveProperty('clearSelection');
    expect(MSADeckGLViewer.prototype).not.toHaveProperty('setRegion');
    expect(MSADeckGLViewer.prototype).not.toHaveProperty('clearRegion');
    expect(MSADeckGLViewer.prototype).not.toHaveProperty('loadFromProcessedData');
    expect(MSADeckGLViewer.prototype).not.toHaveProperty('_applyProcessedData');
  });

  it('reclamps and republishes viewport state after container resize', () => {
    let resizeCallback;
    const disconnect = vi.fn();
    const observe = vi.fn();
    const originalResizeObserver = globalThis.ResizeObserver;
    globalThis.ResizeObserver = class {
      constructor(callback) {
        resizeCallback = callback;
      }

      disconnect() {
        disconnect();
      }

      observe(element) {
        observe(element);
      }
    };

    try {
      const viewer = makeViewer();
      viewer.container = { clientWidth: 800, clientHeight: 500 };
      viewer.state.seqs = [{ id: 'taxon-a', seq: 'ACGT' }];
      viewer.adjustLabelWidth = vi.fn();
      viewer.handleViewStateChange = vi.fn();

      viewer.startResizeObserver();
      resizeCallback();

      expect(observe).toHaveBeenCalledWith(viewer.container);
      expect(viewer.adjustLabelWidth).toHaveBeenCalledWith({ updateDeck: false });
      expect(viewer.handleViewStateChange).toHaveBeenCalledWith(viewer.state.viewState, {
        force: true,
        layoutChanged: true,
      });
    } finally {
      globalThis.ResizeObserver = originalResizeObserver;
    }
  });

  it('updates deck once per view-state change when label width is unchanged', () => {
    const viewer = makeViewer();
    const setProps = vi.fn();
    viewer.container = {
      clientWidth: 800,
      clientHeight: 500,
    };
    viewer.DEFAULT_LABELS_WIDTH = 20;
    viewer.LABELS_WIDTH = 100;
    viewer.AXIS_HEIGHT = 20;
    viewer.MIN_ZOOM = -8;
    viewer.MAX_ZOOM = 10;
    viewer._labelMeasuredWidth = 100;
    viewer.options = { cellSize: 12 };
    viewer.renderThrottled = vi.fn();
    viewer.state = {
      ...viewer.state,
      deckgl: { setProps },
      seqs: [{ id: 'taxon-a', seq: 'ACGT' }],
      rows: 1,
      cols: 4,
      viewState: { target: [100, 100, 0], zoom: 0 },
    };

    viewer.handleViewStateChange({
      target: [101, 100, 0],
      zoom: 0,
    });

    expect(setProps).toHaveBeenCalledTimes(1);
    expect(setProps.mock.calls[0][0]).toHaveProperty('viewState');
  });

  it('rebuilds numeric Deck views when container layout changes', () => {
    const viewer = makeViewer();
    const setProps = vi.fn();
    viewer.container = { clientWidth: 900, clientHeight: 600 };
    viewer.DEFAULT_LABELS_WIDTH = 20;
    viewer.LABELS_WIDTH = 100;
    viewer.AXIS_HEIGHT = 20;
    viewer.MIN_ZOOM = -8;
    viewer.MAX_ZOOM = 10;
    viewer._labelMeasuredWidth = 100;
    viewer.renderThrottled = vi.fn();
    viewer.state = {
      ...viewer.state,
      deckgl: { setProps },
      seqs: [{ id: 'taxon-a', seq: 'ACGT' }],
      rows: 1,
      cols: 4,
      viewState: { target: [100, 100, 0], zoom: 0 },
    };

    viewer.handleViewStateChange(viewer.state.viewState, {
      force: true,
      layoutChanged: true,
    });

    expect(setProps).toHaveBeenCalledTimes(1);
    expect(setProps.mock.calls[0][0].views).toHaveLength(4);
  });

  it('does not rebuild layers while panning inside the overscanned render range', () => {
    const viewer = makeViewer();
    const setProps = vi.fn();
    viewer.container = { clientWidth: 800, clientHeight: 500 };
    viewer.DEFAULT_LABELS_WIDTH = 20;
    viewer.LABELS_WIDTH = 100;
    viewer.AXIS_HEIGHT = 20;
    viewer.MIN_ZOOM = -8;
    viewer.MAX_ZOOM = 10;
    viewer._labelMeasuredWidth = 100;
    viewer._renderedRange = { r0: 0, r1: 9, c0: 0, c1: 99 };
    viewer.renderThrottled = vi.fn();
    viewer.state = {
      ...viewer.state,
      deckgl: { setProps },
      seqs: Array.from({ length: 10 }, (_, row) => ({ id: `taxon-${row}`, seq: 'A'.repeat(100) })),
      rows: 10,
      cols: 100,
      viewState: { target: [100, 50, 0], zoom: 0 },
    };

    viewer.handleViewStateChange({ target: [101, 50, 0], zoom: 0 });

    expect(setProps).toHaveBeenCalledTimes(1);
    expect(viewer.renderThrottled).not.toHaveBeenCalled();
  });
});

describe('MSADeckGLViewer destroy', () => {
  function makeDestroyable() {
    const viewer = makeViewer();
    const container = {
      removeChild: vi.fn(),
      removeEventListener: vi.fn(),
    };
    viewer.container = container;
    viewer.canvas = { parentNode: container };
    viewer._handleWheel = vi.fn();
    viewer.frame = 12;
    viewer.resizeObserver = { disconnect: vi.fn() };
    viewer._initialLayoutObserver = { disconnect: vi.fn() };
    viewer.state.deckgl = { finalize: vi.fn() };
    return { viewer, container };
  }

  it('releases every resource it created', () => {
    const cancel = vi.fn();
    vi.stubGlobal('cancelAnimationFrame', cancel);
    const { viewer, container } = makeDestroyable();
    const { resizeObserver, _initialLayoutObserver: layoutObserver, state } = viewer;
    const deck = state.deckgl;

    viewer.destroy();

    expect(viewer._destroyed).toBe(true);
    expect(cancel).toHaveBeenCalledWith(12);
    expect(layoutObserver.disconnect).toHaveBeenCalledOnce();
    expect(resizeObserver.disconnect).toHaveBeenCalledOnce();
    expect(container.removeEventListener).toHaveBeenCalledWith('wheel', viewer._handleWheel);
    expect(deck.finalize).toHaveBeenCalledOnce();
    expect(container.removeChild).toHaveBeenCalledWith(viewer.canvas);
    expect(viewer.frame).toBeNull();
    expect(viewer.resizeObserver).toBeNull();
    expect(viewer.state.deckgl).toBeNull();
    vi.unstubAllGlobals();
  });

  it('leaves the canvas alone once it has been reparented away from the container', () => {
    const { viewer, container } = makeDestroyable();
    const otherParent = { removeChild: vi.fn() };
    viewer.canvas = { parentNode: otherParent };

    viewer.destroy();

    // Not ours to remove any more, but the deck must still be finalized.
    expect(container.removeChild).not.toHaveBeenCalled();
    expect(otherParent.removeChild).not.toHaveBeenCalled();
    expect(viewer.state.deckgl).toBeNull();
  });

  it('destroys cleanly when nothing was ever created', () => {
    const viewer = makeViewer();
    expect(() => viewer.destroy()).not.toThrow();
    expect(viewer._destroyed).toBe(true);
  });
});
