const { expect } = require('chai');
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const Module = require('module');

require.extensions['.css'] = () => { };

const dom = new JSDOM('<!doctype html><html><body></body></html>');
global.window = dom.window;
global.document = dom.window.document;
global.requestAnimationFrame = dom.window.requestAnimationFrame || ((cb) => setTimeout(cb, 0));
global.cancelAnimationFrame = dom.window.cancelAnimationFrame || ((id) => clearTimeout(id));

const mockDeckGLCore = {
  Deck: class {
    constructor(props) {
      this.props = props || {};
    }
    setProps(nextProps) {
      this.props = { ...this.props, ...nextProps };
    }
    finalize() { }
  },
  OrthographicView: class {
    constructor(opts) {
      this.opts = opts;
    }
  },
  COORDINATE_SYSTEM: { CARTESIAN: 1 }
};

class MockLayer {
  constructor(props) {
    this.props = props || {};
    this.id = this.props.id;
  }
  clone(nextProps) {
    return new this.constructor({ ...this.props, ...nextProps });
  }
}

const mockDeckGLLayers = {
  PathLayer: class PathLayer extends MockLayer { },
  ScatterplotLayer: class ScatterplotLayer extends MockLayer { }
};

const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === '@deck.gl/core') return mockDeckGLCore;
  if (request === '@deck.gl/layers') return mockDeckGLLayers;
  return originalLoad.apply(this, arguments);
};

const { MovieTimelineManager } = require('../src/timeline/core/MovieTimelineManager.js');
const { AnimationRunner } = require('../src/treeVisualisation/systems/AnimationRunner.js');
const { calculatePlaybackState } = require('../src/domain/animation/AnimationTiming.js');
const { useAppStore } = require('../src/state/phyloStore/store.js');

function loadMovieData() {
  const candidates = [
    path.join(__dirname, 'data', 'small_example', 'small_example.response.json'),
    path.join(__dirname, 'data', 'example.json')
  ];

  for (const filePath of candidates) {
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch { }
  }

  throw new Error('No input JSON found for timeline manager lifecycle test.');
}

function makeContainer(width = 800, height = 80) {
  const container = global.document.createElement('div');
  container.getBoundingClientRect = () => ({
    width,
    height,
    top: 0,
    left: 0,
    right: width,
    bottom: height
  });
  global.document.body.appendChild(container);
  return container;
}

describe('MovieTimelineManager lifecycle', () => {
  let movieData;

  before(() => {
    movieData = loadMovieData();
  });

  after(() => {
    Module._load = originalLoad;
  });

  afterEach(() => {
    useAppStore.setState({
      playing: false,
      animationStartTime: null,
      animationSpeed: 1,
      transitionDuration: 1,
      pauseDuration: 0,
      playhead: {
        animationProgress: 0,
        timelineProgress: null,
        currentTreeIndex: 0
      },
      currentTreeIndex: 0,
      treeList: [],
      movieTimelineManager: null,
      hoveredSegmentIndex: null,
      hoveredSegmentData: null,
      hoveredSegmentPosition: null,
      isTooltipHovered: false
    });
  });

  it('requires an explicit normalized tree list', () => {
    expect(() => new MovieTimelineManager(movieData, { fullTreeIndices: [] }))
      .to.throw('MovieTimelineManager requires a non-empty normalized treeList');
  });

  it('can exist before a host container is available', () => {
    const manager = new MovieTimelineManager(movieData, { fullTreeIndices: [] }, movieData.interpolated_trees);

    expect(manager.timeline).to.equal(null);
    expect(manager.container).to.equal(null);
    expect(manager.getSegmentCount()).to.be.greaterThan(0);
    expect(manager.getTimelineProgressForTreeIndex(0)).to.be.a('number');

    manager.destroy();
  });

  it('mounts into an explicit host and unmounts cleanly', () => {
    const manager = new MovieTimelineManager(movieData, { fullTreeIndices: [] }, movieData.interpolated_trees);
    const host = makeContainer();

    manager.mount(host);

    expect(manager.container).to.equal(host);
    expect(manager.timeline).to.exist;
    expect(manager.timeline.container).to.equal(host);
    expect(host.children.length).to.equal(1);

    manager.unmount();

    expect(manager.timeline).to.equal(null);
    expect(manager.container).to.equal(null);
    expect(host.children.length).to.equal(0);
    expect(manager.getSegmentCount()).to.be.greaterThan(0);

    manager.destroy();
  });

  it('remounts into a new host without leaving stale DOM behind', () => {
    const manager = new MovieTimelineManager(movieData, { fullTreeIndices: [] }, movieData.interpolated_trees);
    const firstHost = makeContainer(640, 60);
    const secondHost = makeContainer(720, 90);

    manager.mount(firstHost);
    expect(firstHost.children.length).to.equal(1);

    manager.mount(secondHost);

    expect(firstHost.children.length).to.equal(0);
    expect(secondHost.children.length).to.equal(1);
    expect(manager.container).to.equal(secondHost);
    expect(manager.timeline).to.exist;
    expect(manager.timeline.container).to.equal(secondHost);

    manager.destroy();
  });

  it('clears transient tooltip and hover state on unmount', () => {
    const manager = new MovieTimelineManager(movieData, { fullTreeIndices: [] }, movieData.interpolated_trees);
    const host = makeContainer();

    useAppStore.setState({
      hoveredSegmentIndex: 2,
      hoveredSegmentData: { treeName: 'Example' },
      hoveredSegmentPosition: { x: 120, y: 40 },
      isTooltipHovered: true
    });

    manager.mount(host);
    manager.unmount();

    const state = useAppStore.getState();
    expect(state.isTooltipHovered).to.equal(false);
    expect(state.hoveredSegmentIndex).to.equal(null);
    expect(state.hoveredSegmentData).to.equal(null);
    expect(state.hoveredSegmentPosition).to.equal(null);

    manager.destroy();
  });

  it('restores scrubber position and segment selection on remount from store state', () => {
    const manager = new MovieTimelineManager(movieData, { fullTreeIndices: [] }, movieData.interpolated_trees);
    const firstHost = makeContainer(640, 60);
    const secondHost = makeContainer(640, 60);

    useAppStore.setState({
      playing: false,
      playhead: {
        animationProgress: 0.1,
        timelineProgress: 0.6,
        currentTreeIndex: 0
      }
    });

    manager.mount(firstHost);

    const firstScrubberMs = manager.timeline._scrubberMs;
    const firstSelectedId = manager.timeline._selectedId;

    expect(firstScrubberMs).to.be.a('number');
    expect(firstSelectedId).to.be.a('number');

    manager.unmount();
    manager.mount(secondHost);

    expect(manager.timeline._scrubberMs).to.equal(firstScrubberMs);
    expect(manager.timeline._selectedId).to.equal(firstSelectedId);

    manager.destroy();
  });

  it('keeps fractional timeline position when playback resumes after scrubbing', () => {
    const previousPerformance = global.performance;
    const now = 10_000;
    global.performance = {
      ...(previousPerformance || {}),
      now: () => now
    };

    try {
      const trees = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }, { id: 'e' }];
      const timelineProgress = 0.42;
      const manager = {
        getInterpolationDataForTimelineProgress: (progress) => {
          expect(progress).to.equal(timelineProgress);
          return {
            fromIndex: 1,
            toIndex: 2,
            timeFactor: 0.25
          };
        },
        getTimelineProgressForLinearTreeProgress: () => timelineProgress
      };

      useAppStore.setState({
        treeList: trees,
        movieTimelineManager: manager,
        animationSpeed: 1,
        playhead: {
          animationProgress: 0,
          timelineProgress,
          currentTreeIndex: 0
        },
        playing: false
      });

      useAppStore.getState().play();

      const state = useAppStore.getState();
      expect(state.playhead).to.deep.equal({
        animationProgress: 0.3125,
        timelineProgress,
        currentTreeIndex: 1
      });
      expect(state.animationStartTime).to.equal(now - 1250);
    } finally {
      global.performance = previousPerformance;
    }
  });

  it('uses configured transition and pause duration when playback resumes', () => {
    const previousPerformance = global.performance;
    const now = 10_000;
    global.performance = {
      ...(previousPerformance || {}),
      now: () => now
    };

    try {
      const trees = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }, { id: 'e' }];
      const timelineProgress = 0.42;
      const manager = {
        getInterpolationDataForTimelineProgress: () => ({
          fromIndex: 1,
          toIndex: 2,
          timeFactor: 0.25
        }),
        getTimelineProgressForLinearTreeProgress: () => timelineProgress
      };

      useAppStore.setState({
        treeList: trees,
        movieTimelineManager: manager,
        animationSpeed: 1,
        transitionDuration: 2,
        pauseDuration: 0.5,
        playhead: {
          animationProgress: 0,
          timelineProgress,
          currentTreeIndex: 0
        },
        playing: false
      });

      useAppStore.getState().play();

      const state = useAppStore.getState();
      expect(state.playhead.animationProgress).to.equal(0.3125);
      expect(state.animationStartTime).to.equal(now - 3000);

      const resumedPlayback = calculatePlaybackState({
        timestamp: now,
        startTime: state.animationStartTime,
        speed: state.animationSpeed,
        totalItems: trees.length,
        transitionDuration: state.transitionDuration,
        pauseDuration: state.pauseDuration
      });
      expect(resumedPlayback.fromIndex).to.equal(1);
      expect(resumedPlayback.toIndex).to.equal(2);
      expect(resumedPlayback.localT).to.equal(0.25);
    } finally {
      global.performance = previousPerformance;
    }
  });

  it('uses configured transition duration when advancing animation frames', async () => {
    let renderOptions = null;
    let renderedT = null;
    let syncedProgress = null;

    const runner = new AnimationRunner({
      getState: () => ({
        playing: true,
        animationStartTime: 1_000,
        animationSpeed: 1,
        transitionDuration: 2,
        pauseDuration: 0,
        treeList: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
        comparisonMode: false
      }),
      getOrCacheInterpolationData: () => ({
        dataFrom: { nodes: [] },
        dataTo: { nodes: [] }
      }),
      renderSingleFrame: async (_fromTree, _toTree, easedT, options) => {
        renderedT = easedT;
        renderOptions = options;
      },
      renderComparisonFrame: async () => {},
      setAnimationStage: () => {},
      updateProgress: (progress) => {
        syncedProgress = progress;
      },
      stopAnimation: () => {},
      requestRedraw: () => {}
    });

    runner.isRunning = true;
    const shouldStop = await runner._processFrame(2_000);

    expect(shouldStop).to.equal(false);
    expect(syncedProgress).to.equal(0.25);
    expect(renderOptions.fromTreeIndex).to.equal(0);
    expect(renderOptions.toTreeIndex).to.equal(1);
    expect(renderedT).to.equal(0.5);
  });

  it('does not force a redraw after animation render updates layers', async () => {
    const previousRequestAnimationFrame = global.requestAnimationFrame;
    const previousCancelAnimationFrame = global.cancelAnimationFrame;
    let renderCount = 0;
    let redrawCount = 0;

    global.requestAnimationFrame = () => 1;
    global.cancelAnimationFrame = () => {};

    try {
      const runner = new AnimationRunner({
        getState: () => ({
          playing: true,
          animationStartTime: 1_000,
          animationSpeed: 1,
          transitionDuration: 2,
          pauseDuration: 0,
          treeList: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
          comparisonMode: false
        }),
        getOrCacheInterpolationData: () => ({
          dataFrom: { nodes: [] },
          dataTo: { nodes: [] }
        }),
        renderSingleFrame: async () => {
          renderCount += 1;
        },
        renderComparisonFrame: async () => {},
        setAnimationStage: () => {},
        updateProgress: () => {},
        stopAnimation: () => {},
        requestRedraw: () => {
          redrawCount += 1;
        }
      });

      runner.isRunning = true;
      await runner._onFrame(2_000, runner._runToken);
      runner.stop();

      expect(renderCount).to.equal(1);
      expect(redrawCount).to.equal(0);
    } finally {
      global.requestAnimationFrame = previousRequestAnimationFrame;
      global.cancelAnimationFrame = previousCancelAnimationFrame;
    }
  });

  it('does not overlap renders when playback restarts before a frame settles', async () => {
    const previousRequestAnimationFrame = global.requestAnimationFrame;
    const previousCancelAnimationFrame = global.cancelAnimationFrame;
    const frameCallbacks = [];
    let nextFrameId = 1;
    let releaseRender;
    let renderCount = 0;
    let redrawCount = 0;

    global.requestAnimationFrame = (callback) => {
      frameCallbacks.push(callback);
      return nextFrameId++;
    };
    global.cancelAnimationFrame = () => {};

    const renderPromise = new Promise((resolve) => {
      releaseRender = resolve;
    });

    try {
      const runner = new AnimationRunner({
        getState: () => ({
          playing: true,
          animationStartTime: 1_000,
          animationSpeed: 1,
          transitionDuration: 2,
          pauseDuration: 0,
          treeList: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
          comparisonMode: false
        }),
        getOrCacheInterpolationData: () => ({
          dataFrom: { nodes: [] },
          dataTo: { nodes: [] }
        }),
        renderSingleFrame: async () => {
          renderCount += 1;
          await renderPromise;
        },
        renderComparisonFrame: async () => {},
        setAnimationStage: () => {},
        updateProgress: () => {},
        stopAnimation: () => {},
        requestRedraw: () => {
          redrawCount += 1;
        }
      });

      runner.start();
      const firstFrame = frameCallbacks[0](2_000);
      await Promise.resolve();
      expect(renderCount).to.equal(1);

      runner.stop();
      runner.start();
      const secondFrame = frameCallbacks[1](2_005);
      await Promise.resolve();

      expect(renderCount).to.equal(1);

      releaseRender();
      await firstFrame;
      await secondFrame;

      expect(redrawCount).to.equal(0);
    } finally {
      global.requestAnimationFrame = previousRequestAnimationFrame;
      global.cancelAnimationFrame = previousCancelAnimationFrame;
    }
  });

  it('maps generic scrub position through weighted timeline progress', () => {
    const trees = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }, { id: 'e' }];
    const manager = {
      getTimelineProgressForLinearTreeProgress: (progress, treeCount) => {
        expect(progress).to.equal(0.25);
        expect(treeCount).to.equal(trees.length);
        return 0.6;
      }
    };

    useAppStore.setState({
      treeList: trees,
      movieTimelineManager: manager,
      playhead: {
        animationProgress: 0,
        timelineProgress: null,
        currentTreeIndex: 0
      },
      currentTreeIndex: 0
    });

    useAppStore.getState().setScrubPosition(0.25);

    const state = useAppStore.getState();
    expect(state.currentTreeIndex).to.equal(1);
    expect(state.playhead).to.deep.equal({
      animationProgress: 0.25,
      timelineProgress: 0.6,
      currentTreeIndex: 1
    });
  });

  it('updates stored timeline progress while playback advances', () => {
    useAppStore.setState({
      playing: true,
      playhead: {
        animationProgress: 0,
        timelineProgress: 0.2,
        currentTreeIndex: 0
      }
    });

    useAppStore.getState().updateTimelineState({
      currentSegmentIndex: 1,
      totalSegments: 4,
      treeInSegment: 2,
      treesInSegment: 3,
      timelineProgress: 0.7
    });

    const state = useAppStore.getState();
    expect(state.playhead.timelineProgress).to.equal(0.7);
    expect(state.currentSegmentIndex).to.equal(1);
    expect(state.treeInSegment).to.equal(2);
    expect(state.treesInSegment).to.equal(3);
  });

  it('does not publish a new playhead when timeline state is unchanged', () => {
    useAppStore.setState({
      playing: true,
      currentSegmentIndex: 1,
      totalSegments: 4,
      treeInSegment: 2,
      treesInSegment: 3,
      playhead: {
        animationProgress: 0.4,
        timelineProgress: 0.7,
        currentTreeIndex: 2
      },
      currentTreeIndex: 2
    });

    const previousPlayhead = useAppStore.getState().playhead;
    let updateCount = 0;
    const unsubscribe = useAppStore.subscribe(() => {
      updateCount += 1;
    });

    try {
      useAppStore.getState().updateTimelineState({
        currentSegmentIndex: 1,
        totalSegments: 4,
        treeInSegment: 2,
        treesInSegment: 3,
        timelineProgress: 0.7
      });
    } finally {
      unsubscribe();
    }

    const state = useAppStore.getState();
    expect(updateCount).to.equal(0);
    expect(state.playhead).to.equal(previousPlayhead);
  });

  it('coalesces repeated timeline store notifications into one pending frame', () => {
    const previousRequestAnimationFrame = global.requestAnimationFrame;
    const previousCancelAnimationFrame = global.cancelAnimationFrame;
    const frameCallbacks = [];
    let nextFrameId = 1;
    let scheduledCount = 0;

    global.requestAnimationFrame = (callback) => {
      scheduledCount += 1;
      frameCallbacks.push(callback);
      return nextFrameId++;
    };
    global.cancelAnimationFrame = () => {};

    try {
      const manager = new MovieTimelineManager(movieData, { fullTreeIndices: [] }, movieData.interpolated_trees);
      frameCallbacks.pop()?.(0);
      scheduledCount = 0;

      useAppStore.setState({
        playhead: { animationProgress: 0.1, timelineProgress: 0.1, currentTreeIndex: 0 }
      });
      useAppStore.setState({
        playhead: { animationProgress: 0.2, timelineProgress: 0.2, currentTreeIndex: 0 }
      });
      useAppStore.setState({
        playhead: { animationProgress: 0.3, timelineProgress: 0.3, currentTreeIndex: 0 }
      });

      expect(scheduledCount).to.equal(1);

      frameCallbacks.pop()?.(1_000);
      scheduledCount = 0;

      useAppStore.setState({
        playhead: { animationProgress: 0.4, timelineProgress: 0.4, currentTreeIndex: 0 }
      });

      expect(scheduledCount).to.equal(1);

      manager.destroy();
    } finally {
      global.requestAnimationFrame = previousRequestAnimationFrame;
      global.cancelAnimationFrame = previousCancelAnimationFrame;
    }
  });

  it('binds renderer scrub state to the scrub controller', async () => {
    const manager = new MovieTimelineManager(movieData, { fullTreeIndices: [] }, movieData.interpolated_trees);
    const host = makeContainer();

    manager.mount(host);
    expect(manager.timeline.isScrubbing()).to.equal(false);

    await manager.scrubController.startScrubbing(0);
    expect(manager.timeline.isScrubbing()).to.equal(true);

    manager.scrubController.resetOnUnmount();
    expect(manager.timeline.isScrubbing()).to.equal(false);

    manager.destroy();
  });

  it('treats unmount after destroy as a no-op', () => {
    const manager = new MovieTimelineManager(movieData, { fullTreeIndices: [] }, movieData.interpolated_trees);
    const host = makeContainer();

    manager.mount(host);
    manager.destroy();

    expect(() => manager.unmount()).to.not.throw();
    expect(manager.timeline).to.equal(null);
    expect(manager.container).to.equal(null);
  });
});
