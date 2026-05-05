// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { handleContainerResize } from '../../src/treeVisualisation/interaction/InteractionHandlers.js';
import { useAppStore } from '../../src/state/phyloStore/store.js';

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

  it('manual fit includes labels by default', () => {
    const controller = Object.create(ControllerClass.prototype);
    const node = { id: 'node-1', position: [0, 0, 0] };
    const label = { id: 'label-1', position: [1000, 0, 0], text: 'long label' };
    const link = { id: 'link-1', path: new Float32Array([0, 0, 0, 1, 1, 0]) };
    controller._lastLayerData = {
      nodes: [node],
      labels: [label],
      links: [link],
      connectors: [],
    };
    controller.viewportManager = {
      focusOnTree: vi.fn(),
    };

    controller.fitTreeToViewport();

    expect(controller.viewportManager.focusOnTree).toHaveBeenCalledWith([node], [label], {
      includeLabels: true,
      duration: 350,
      padding: undefined,
      links: [link],
    });
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
