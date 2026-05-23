// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { handleContainerResize } from '../../src/treeVisualisation/interaction/InteractionHandlers.js';
import { useAppStore } from '../../src/state/phyloStore/store.js';
import { StaticRenderer } from '../../src/treeVisualisation/systems/StaticRenderer.js';
import { VIEWPORT_FIT_MODES } from '../../src/treeVisualisation/viewport/viewportFit.js';

class MockWorker {
  constructor() {
    this.onmessage = null;
  }

  postMessage() {}

  terminate() {}
}

const mockDimensions = { width: 1234, height: 777 };

vi.mock('../../src/treeVisualisation/deckgl/context/DeckGLContext.js', () => ({
  DeckGLContext: class MockDeckGLContext {
    constructor(container) {
      this.container = container;
      this.deck = {};
    }

    initialize() {}

    onWebGLInitialized(callback) {
      this.onWebGLInitializedCallback = callback;
    }

    onError() {}
    onNodeClick() {}
    onDragStart() {}
    onDrag() {}
    onDragEnd() {}
    onResize(callback) {
      this.onResizeCallback = callback;
    }
    addViewStateListener() {}

    getCanvasDimensions() {
      return mockDimensions;
    }

    destroy() {}
  },
}));

describe('tree viewport behavior', () => {
  let ControllerClass;

  beforeEach(async () => {
    vi.stubGlobal('Worker', MockWorker);
    vi.stubGlobal('requestAnimationFrame', (callback) => {
      callback();
      return 1;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());

    const module = await import('../../src/treeVisualisation/DeckGLTreeAnimationController.js');
    ControllerClass = module.DeckGLTreeAnimationController;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('uses measured deck dimensions before the first mount render', () => {
    const controller = new ControllerClass();
    let renderedDimensions = null;
    controller.renderAllElements = vi.fn(() => {
      renderedDimensions = { width: controller.width, height: controller.height };
    });

    controller.mount(document.createElement('div'));

    expect(renderedDimensions).toEqual(mockDimensions);

    controller.destroy();
  });

  it('automatic static fit remains branch-focused when labels are visible', () => {
    const node = { id: 'node-1', position: [0, 0, 0] };
    const label = {
      id: 'label-1',
      position: [1000, 0, 0],
      text: 'Long visible label should not define automatic camera zoom',
    };
    const link = { id: 'link-1', path: new Float32Array([0, 0, 0, 10, 0, 0]) };
    const extension = { id: 'extension-1', path: new Float32Array([10, 0, 0, 605, 0, 0]) };
    const controller = {
      _lastFocusedTreeIndex: null,
      calculateLayout: vi.fn(() => ({ layoutTree: {}, max_radius: 10 })),
      _getConsistentRadii: vi.fn(() => ({ extensionRadius: 605, labelRadius: 625 })),
      dataConverter: {
        convertTreeToLayerData: vi.fn(() => ({
          nodes: [node],
          labels: [label],
          links: [link],
          extensions: [extension],
        })),
      },
      _updateLayersEfficiently: vi.fn(),
      viewportManager: {
        focusOnTree: vi.fn(),
      },
    };

    new StaticRenderer(controller)._renderSingleTree(
      0,
      99,
      [{ id: 'short-current-tree' }],
      { labelsVisible: true },
      'radial-elbow'
    );

    expect(controller.viewportManager.focusOnTree).toHaveBeenCalledWith([node], [label], {
      fitMode: VIEWPORT_FIT_MODES.BRANCH,
      links: [link, extension],
    });
    expect(controller._lastFocusedTreeIndex).toBe(0);
  });

  it('manual fit includes labels by default', () => {
    const controller = Object.create(ControllerClass.prototype);
    const node = { id: 'node-1', position: [0, 0, 0] };
    const label = { id: 'label-1', position: [1000, 0, 0], text: 'long label' };
    const link = { id: 'link-1', path: new Float32Array([0, 0, 0, 1, 1, 0]) };
    const extension = { id: 'extension-1', path: new Float32Array([1, 1, 0, 1000, 0, 0]) };
    controller._lastLayerData = {
      nodes: [node],
      labels: [label],
      links: [link],
      extensions: [extension],
      connectors: [],
    };
    controller._hasUserViewportInteraction = false;
    controller.viewportManager = {
      focusOnTree: vi.fn(),
    };

    controller.fitTreeToViewport();

    expect(controller.viewportManager.focusOnTree).toHaveBeenCalledWith([node], [label], {
      fitMode: VIEWPORT_FIT_MODES.LABELS,
      duration: 350,
      padding: undefined,
      links: [link, extension],
    });
    expect(controller._hasUserViewportInteraction).toBe(true);
  });

  it('labels the manual viewport control as fitting visible content', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/components/deckgl/TreeCanvasControls.jsx'),
      'utf8'
    );

    expect(source).toContain('Fit all visible content');
    expect(source).not.toContain('Fit tree to viewport');
  });

  it('resize marks an untouched single-tree view for refit', async () => {
    useAppStore.setState({ playing: false });
    const controller = {
      _resizeRenderScheduled: false,
      _lastFocusedTreeIndex: 0,
      _hasUserViewportInteraction: false,
      layerManager: { comparisonRenderer: { resetAutoFit: vi.fn() } },
      renderAllElements: vi.fn(),
    };

    handleContainerResize(controller);
    await Promise.resolve();

    expect(controller._lastFocusedTreeIndex).toBeNull();
    expect(controller.renderAllElements).toHaveBeenCalledOnce();
  });

  it('resize before interaction refits the next static render with branch-focused bounds', async () => {
    useAppStore.setState({ playing: false });
    const node = { id: 'node-1', position: [0, 0, 0] };
    const label = { id: 'label-1', position: [900, 0, 0], text: 'Visible long label' };
    const link = { id: 'link-1', path: new Float32Array([0, 0, 0, 10, 0, 0]) };
    const extension = { id: 'extension-1', path: new Float32Array([10, 0, 0, 905, 0, 0]) };
    const controller = {
      _resizeRenderScheduled: false,
      _lastFocusedTreeIndex: 0,
      _hasUserViewportInteraction: false,
      layerManager: { comparisonRenderer: { resetAutoFit: vi.fn() } },
      calculateLayout: vi.fn(() => ({ layoutTree: {}, max_radius: 10 })),
      _getConsistentRadii: vi.fn(() => ({ extensionRadius: 905, labelRadius: 925 })),
      dataConverter: {
        convertTreeToLayerData: vi.fn(() => ({
          nodes: [node],
          labels: [label],
          links: [link],
          extensions: [extension],
        })),
      },
      _updateLayersEfficiently: vi.fn(),
      viewportManager: {
        focusOnTree: vi.fn(),
      },
    };
    controller.renderAllElements = vi.fn(() => {
      new StaticRenderer(controller)._renderSingleTree(
        0,
        99,
        [{ id: 'short-current-tree' }],
        { labelsVisible: true },
        'radial-elbow'
      );
    });

    handleContainerResize(controller);
    await Promise.resolve();

    expect(controller.viewportManager.focusOnTree).toHaveBeenCalledWith([node], [label], {
      fitMode: VIEWPORT_FIT_MODES.BRANCH,
      links: [link, extension],
    });
  });

  it('resize preserves a user-adjusted single-tree viewport', async () => {
    useAppStore.setState({ playing: false });
    const controller = {
      _resizeRenderScheduled: false,
      _lastFocusedTreeIndex: 0,
      _hasUserViewportInteraction: true,
      layerManager: { comparisonRenderer: { resetAutoFit: vi.fn() } },
      renderAllElements: vi.fn(),
    };

    handleContainerResize(controller);
    await Promise.resolve();

    expect(controller._lastFocusedTreeIndex).toBe(0);
    expect(controller.renderAllElements).toHaveBeenCalledOnce();
  });
});
