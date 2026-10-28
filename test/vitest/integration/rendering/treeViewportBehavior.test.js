// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { handleContainerResize } from '../../../../src/treeVisualisation/interaction/InteractionHandlers.js';
import { useAppStore } from '../../../../src/state/phyloStore/store.js';
import { VIEWPORT_FIT_OBSTRUCTION_SCOPES } from '../../../../src/treeVisualisation/spatial/layout.js';
import { getLinksLayerProps } from '../../../../src/treeVisualisation/deckgl/layers/factory/links/LinkLayers.js';
import { StaticRenderer } from '../../../../src/treeVisualisation/systems/StaticRenderer.js';
import {
  VIEWPORT_FIT_MODES,
  VIEWPORT_FIT_PIXEL_PADDING,
} from '../../../../src/treeVisualisation/viewport/viewportFit.js';

class MockWorker {
  constructor() {
    this.onmessage = null;
  }

  postMessage() {}

  terminate() {}
}

const mockDimensions = { width: 1234, height: 777 };

vi.mock('../../../../src/treeVisualisation/deckgl/context/DeckGLContext.js', () => ({
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

    const module =
      await import('../../../../src/treeVisualisation/DeckGLTreeAnimationController.js');
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

  it('measures branch width zoom from the recorded fit zoom in every render context', () => {
    useAppStore.setState({ playing: false });
    const controller = new ControllerClass();
    let viewZoom = 0;
    const transitionTo = vi.fn();
    controller.deckContext = {
      container: null,
      getCanvasDimensions: () => mockDimensions,
      getActiveView: () => null,
      getViewState: () => ({ target: [0, 0, 0], zoom: viewZoom }),
      transitionTo,
      destroy() {},
    };

    expect(controller._createLayerRenderContext({}).fitZoom).toBeNull();

    controller.viewportManager.focusOnTree(
      [{ position: [-100, -100, 0] }, { position: [100, 100, 0] }],
      [],
      { duration: 0 }
    );
    const fitZoom = transitionTo.mock.calls[0][0].zoom;
    viewZoom = fitZoom + 2;

    // The pinned-tree overlay builds its context from data that carries no camera.
    const overlayContext = controller._createLayerRenderContext({});
    expect(overlayContext).toMatchObject({ fitZoom, zoom: fitZoom + 2 });
    expect(controller._createLayerRenderContext({ zoom: 9 }).zoom).toBe(9);

    const { layerStyles } = controller.layerManager;
    const widthScale = getLinksLayerProps([], overlayContext, layerStyles).widthScale;
    expect(widthScale).toBeCloseTo(2);
    expect(
      getLinksLayerProps([], { ...overlayContext, fitZoom: null }, layerStyles).widthScale
    ).not.toBeCloseTo(2);

    controller.destroy();
  });

  it('loads the workspace tour only after the user targets its launcher', () => {
    const source = readFileSync(join(process.cwd(), 'src/features/tours/TourLauncher.jsx'), 'utf8');

    expect(source).not.toContain("from './workspaceTour.js'");
    expect(source).toContain("const loadWorkspaceTour = () => import('./workspaceTour.js')");
    expect(source).toContain('onMouseEnter={preloadWorkspaceTour}');
    expect(source).toContain('onFocus={preloadWorkspaceTour}');
  });

  it('automatic static fit frames full label text when labels are visible', () => {
    const node = { id: 'node-1', position: [0, 0, 0] };
    const label = {
      id: 'label-1',
      position: [1000, 0, 0],
      text: 'Long visible label must stay inside the automatic camera fit',
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
      fitMode: VIEWPORT_FIT_MODES.LABELS,
      pixelPadding: VIEWPORT_FIT_PIXEL_PADDING,
      obstructionScope: VIEWPORT_FIT_OBSTRUCTION_SCOPES.CANVAS,
      maxFitAreaCenterDriftRatio: 0.2,
      links: [link, extension],
    });
    expect(controller._lastFocusedTreeIndex).toBe(0);
  });

  it('refits when the layout projection changes, even after the view was moved', () => {
    const renderAllElements = vi.fn(() => Promise.resolve());
    const controller = {
      _lastFocusedTreeIndex: 0,
      _hasUserViewportInteraction: true,
      renderAllElements,
      resetInterpolationCaches: vi.fn(),
      resetComparisonAutoFit: vi.fn(),
    };
    useAppStore.setState({ treeController: controller, layoutProjectionMode: 'unrooted' });
    try {
      useAppStore.getState().setLayoutProjectionMode('rectangular');
      // Clearing the focused index is what makes the next render fit again.
      expect(controller._lastFocusedTreeIndex).toBeNull();
      expect(renderAllElements).toHaveBeenCalledTimes(1);
      // The same projection changes nothing.
      useAppStore.getState().setLayoutProjectionMode('rectangular');
      expect(renderAllElements).toHaveBeenCalledTimes(1);
    } finally {
      useAppStore.setState({ treeController: null });
      useAppStore.getState().reset();
    }
  });

  it('automatic static fit frames the pinned tree overlay with the active tree', () => {
    const node = { id: 'node-1', position: [0, 0, 0] };
    const pinnedNode = { id: 'pinned-node', position: [0, -900, 0] };
    const pinnedLabel = { id: 'pinned-label', position: [0, -800, 0], text: 'Ostrich' };
    const pinnedLink = { id: 'pinned-link', path: new Float32Array([0, -900, 0, 10, -900, 0]) };
    const controller = {
      _lastFocusedTreeIndex: null,
      _clipboardFit: { nodes: [pinnedNode], labels: [pinnedLabel], links: [pinnedLink] },
      calculateLayout: vi.fn(() => ({ layoutTree: {}, max_radius: 10 })),
      _getConsistentRadii: vi.fn(() => ({ extensionRadius: 15, labelRadius: 35 })),
      dataConverter: {
        convertTreeToLayerData: vi.fn(() => ({
          nodes: [node],
          labels: [],
          links: [],
          extensions: [],
        })),
      },
      _updateLayersEfficiently: vi.fn(),
      viewportManager: { focusOnTree: vi.fn() },
    };

    new StaticRenderer(controller)._renderSingleTree(
      0,
      0,
      [{ id: 'tree-0' }],
      { labelsVisible: true },
      'radial-elbow'
    );

    expect(controller.viewportManager.focusOnTree).toHaveBeenCalledWith(
      [node, pinnedNode],
      [pinnedLabel],
      expect.objectContaining({ links: [pinnedLink] })
    );
  });

  it('automatic static fit updates when the rendered tree index changes', () => {
    const treeOneNode = { id: 'node-1', position: [200, 50, 0] };
    const controller = {
      _lastFocusedTreeIndex: 0,
      calculateLayout: vi.fn(() => ({ layoutTree: {}, max_radius: 10 })),
      _getConsistentRadii: vi.fn(() => ({ extensionRadius: 15, labelRadius: 35 })),
      dataConverter: {
        convertTreeToLayerData: vi.fn(() => ({
          nodes: [treeOneNode],
          labels: [],
          links: [],
          extensions: [],
        })),
      },
      _updateLayersEfficiently: vi.fn(),
      viewportManager: {
        focusOnTree: vi.fn(),
      },
    };

    new StaticRenderer(controller)._renderSingleTree(
      1,
      0,
      [{ id: 'tree-0' }, { id: 'tree-1' }],
      { frameIndex: 0 },
      'radial-elbow'
    );

    expect(controller.viewportManager.focusOnTree).toHaveBeenCalledWith([treeOneNode], [], {
      fitMode: VIEWPORT_FIT_MODES.BRANCH,
      pixelPadding: VIEWPORT_FIT_PIXEL_PADDING,
      obstructionScope: VIEWPORT_FIT_OBSTRUCTION_SCOPES.CANVAS,
      maxFitAreaCenterDriftRatio: 0.2,
      links: [],
    });
    expect(controller._lastFocusedTreeIndex).toBe(1);
  });

  it('clears stale animation stage before static rendering', async () => {
    useAppStore.setState({
      currentAnimationStage: 'COLLAPSE',
      comparisonMode: true,
      frameIndex: 0,
      treeList: [{ id: 'tree-0' }, { id: 'tree-1' }],
      timelineFrames: [
        { frameIndex: 0, isObservedInput: true },
        { frameIndex: 1, isObservedInput: true },
      ],
    });

    const controller = {
      _destroyed: false,
      ready: true,
      deckContext: { deck: {} },
      comparisonRenderer: {
        renderStatic: vi.fn(),
      },
    };

    try {
      await new StaticRenderer(controller).renderAllElements({
        comparisonMode: true,
        leftIndex: 0,
        rightIndex: 1,
      });

      expect(useAppStore.getState().currentAnimationStage).toBe(null);
      expect(controller.comparisonRenderer.renderStatic).toHaveBeenCalledWith(0, 1);
    } finally {
      useAppStore.getState().reset();
    }
  });

  it('applies explicit motion stage while statically rendering a generated frame', async () => {
    useAppStore.setState({
      currentAnimationStage: null,
      comparisonMode: true,
      frameIndex: 0,
      treeList: [{ id: 'tree-0' }, { id: 'tree-1' }],
      timelineFrames: [
        { frameIndex: 0, isObservedInput: true },
        { frameIndex: 1, isObservedInput: true },
      ],
    });

    const controller = {
      _destroyed: false,
      ready: true,
      deckContext: { deck: {} },
      comparisonRenderer: {
        renderStatic: vi.fn(),
      },
    };

    try {
      await new StaticRenderer(controller).renderAllElements({
        comparisonMode: true,
        leftIndex: 0,
        rightIndex: 1,
        motionStage: 'REORDER',
      });

      expect(useAppStore.getState().currentAnimationStage).toBe('REORDER');
      expect(controller.comparisonRenderer.renderStatic).toHaveBeenCalledWith(0, 1);
    } finally {
      useAppStore.getState().reset();
    }
  });

  it('infers motion stage from the selected generated-frame cursor during static rendering', async () => {
    const sourceTree = { id: 'tree-0' };
    const targetTree = { id: 'tree-1' };
    useAppStore.setState({
      currentAnimationStage: null,
      comparisonMode: true,
      frameIndex: 1,
      treeList: [sourceTree, targetTree],
      timelineFrames: [
        { frameIndex: 0, isObservedInput: true },
        { frameIndex: 1, isObservedInput: false },
      ],
      timelineCursor: {
        frameIndex: 1,
        occurrenceRole: 'motion_target',
        motionSourceFrameIndex: 0,
        motionTargetFrameIndex: 1,
      },
    });

    const controller = {
      _destroyed: false,
      ready: true,
      deckContext: { deck: {} },
      _getOrCacheInterpolationData: vi.fn(() => ({
        dataFrom: { nodes: [{ id: 'node-a' }] },
        dataTo: { nodes: [{ id: 'node-a' }] },
        transitionChangeModel: null,
      })),
      comparisonRenderer: {
        renderStatic: vi.fn(),
      },
    };

    try {
      await new StaticRenderer(controller).renderAllElements({
        comparisonMode: true,
        leftIndex: 1,
        rightIndex: 1,
      });

      expect(useAppStore.getState().currentAnimationStage).toBe('REORDER');
      expect(controller._getOrCacheInterpolationData).toHaveBeenCalledWith(
        sourceTree,
        targetTree,
        0,
        1
      );
    } finally {
      useAppStore.getState().reset();
    }
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
    controller._hasUserViewportInteraction = true;
    controller.viewportManager = {
      focusOnTree: vi.fn(),
    };

    controller.fitTreeToViewport();

    expect(controller.viewportManager.focusOnTree).toHaveBeenCalledWith([node], [label], {
      fitMode: VIEWPORT_FIT_MODES.LABELS,
      pixelPadding: VIEWPORT_FIT_PIXEL_PADDING,
      duration: 350,
      padding: undefined,
      links: [link, extension],
    });
    // A fitted view keeps refitting on later canvas resizes.
    expect(controller._hasUserViewportInteraction).toBe(false);
  });

  it('labels the manual viewport control as fitting visible content', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/components/deckgl/TreeCanvasControls.jsx'),
      'utf8'
    );

    expect(source).toContain('Fit all visible content');
    expect(source).not.toContain('Fit tree to viewport');
  });

  it('sizes every canvas control alike: 32 px, 44 px under a finger', () => {
    const read = (path) => readFileSync(join(process.cwd(), path), 'utf8');
    const controls = read('src/components/deckgl/TreeCanvasControls.jsx');
    // The viewport and export groups share one size; the viewport buttons were 24 px.
    expect(controls).not.toContain('icon-xs');
    // Fit, Zoom out, Reset and Zoom in.
    expect(controls.match(/size="icon"/g)).toHaveLength(4);
    expect(read('src/features/tours/TourLauncher.jsx')).toContain('size="icon"');
    for (const path of ['CopyImageButton', 'SaveImageButton', 'RecordingControls']) {
      expect(read(`src/components/media/${path}.jsx`)).toContain('size="icon"');
    }
    // `icon` is size-9 (2.25rem of the 14 px root) and a coarse pointer gets 44 px in every group.
    expect(read('src/components/ui/button.tsx')).toMatch(/icon: 'size-9'/);
    expect(controls).toContain('pointer-coarse:[&_[data-slot=button]]:size-[44px]');
  });

  it('places the workspace tour launcher inside the canvas export controls', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/components/deckgl/TreeCanvasControls.jsx'),
      'utf8'
    );

    expect(source).not.toContain('aria-label="Workspace help"');
    expect(source).toContain('aria-label="Canvas export controls"');
    expect(source.indexOf('<TourLauncher />')).toBeGreaterThan(
      source.indexOf('aria-label="Canvas export controls"')
    );
    expect(source.indexOf('<TourLauncher />')).toBeLessThan(
      source.indexOf('<RecordingControls disabled={captureDisabled} />')
    );
  });

  it('label visibility changes redraw without resetting the camera', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/components/appearance/controls/VisualStyle/VisualStyle.jsx'),
      'utf8'
    );

    expect(source).toContain('treeController?.renderAllElements({ skipAutoFit: true })');
  });

  it('resize marks an untouched single-tree view for refit', async () => {
    useAppStore.setState({ playing: false });
    const controller = {
      _resizeRenderScheduled: false,
      _lastFocusedTreeIndex: 0,
      _hasUserViewportInteraction: false,
      resetComparisonAutoFit: vi.fn(),
      renderAllElements: vi.fn(),
    };

    handleContainerResize(controller);
    await Promise.resolve();

    expect(controller._lastFocusedTreeIndex).toBeNull();
    expect(controller.renderAllElements).toHaveBeenCalledOnce();
  });

  it('resize before interaction refits the next static render with label bounds', async () => {
    useAppStore.setState({ playing: false });
    const node = { id: 'node-1', position: [0, 0, 0] };
    const label = { id: 'label-1', position: [900, 0, 0], text: 'Visible long label' };
    const link = { id: 'link-1', path: new Float32Array([0, 0, 0, 10, 0, 0]) };
    const extension = { id: 'extension-1', path: new Float32Array([10, 0, 0, 905, 0, 0]) };
    const controller = {
      _resizeRenderScheduled: false,
      _lastFocusedTreeIndex: 0,
      _hasUserViewportInteraction: false,
      resetComparisonAutoFit: vi.fn(),
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
      fitMode: VIEWPORT_FIT_MODES.LABELS,
      pixelPadding: VIEWPORT_FIT_PIXEL_PADDING,
      obstructionScope: VIEWPORT_FIT_OBSTRUCTION_SCOPES.CANVAS,
      maxFitAreaCenterDriftRatio: 0.2,
      links: [link, extension],
    });
  });

  it('resize preserves a user-adjusted single-tree viewport', async () => {
    useAppStore.setState({ playing: false });
    const resetAutoFit = vi.fn();
    const controller = {
      _resizeRenderScheduled: false,
      _lastFocusedTreeIndex: 0,
      _hasUserViewportInteraction: true,
      resetComparisonAutoFit: resetAutoFit,
      renderAllElements: vi.fn(),
    };

    handleContainerResize(controller);
    await Promise.resolve();

    expect(controller._lastFocusedTreeIndex).toBe(0);
    expect(resetAutoFit).not.toHaveBeenCalled();
    expect(controller.renderAllElements).toHaveBeenCalledOnce();
  });
});
