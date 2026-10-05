const { expect } = require('chai');
const fs = require('fs');
const path = require('path');
const sinon = require('sinon');
const { JSDOM } = require('jsdom');
const { clearTimelineModuleCache, installDeckGLMocks } = require('../../helpers/deckGLMocks.js');

require.extensions['.css'] = () => {};

const dom = new JSDOM('<!doctype html><html><body></body></html>');
global.window = dom.window;
global.document = dom.window.document;
global.requestAnimationFrame = dom.window.requestAnimationFrame || ((cb) => setTimeout(cb, 0));
global.cancelAnimationFrame = dom.window.cancelAnimationFrame || ((id) => clearTimeout(id));

installDeckGLMocks();
clearTimelineModuleCache();

const { TimelineController } = require('../../../src/timeline/timelineController.js');
const { buildTimeline } = require('../../../src/timeline/timeline.js');
const { AnimationRunner } = require('../../../src/treeVisualisation/systems/AnimationRunner.js');
const { TransitionFrame } = require('../../../src/treeVisualisation/TransitionFrame.js');
const { selectInputFrameIndices, useAppStore } = require('../../../src/state/phyloStore/store.js');

function loadMovieData() {
  const filePath = path.join(
    process.cwd(),
    'test',
    'data',
    'small_example',
    'small_example.response.json'
  );
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function makeContainer(width = 800, height = 80) {
  const container = global.document.createElement('div');
  container.getBoundingClientRect = () => ({
    width,
    height,
    top: 0,
    left: 0,
    right: width,
    bottom: height,
  });
  global.document.body.appendChild(container);
  return container;
}

function createSemanticRunnerTimeline(trees, stepDurationMs = 2000) {
  const totalDuration = Math.max(1, trees.length - 1) * stepDurationMs;
  const cursorForFrame = (frameIndex) => getCursorAtMovieTime(frameIndex * stepDurationMs);
  const getCursorAtMovieTime = (movieTimeMs) => {
    const boundedTime = Math.max(0, Math.min(totalDuration, movieTimeMs));
    return {
      frameIndex: Math.min(
        Math.ceil((boundedTime / totalDuration) * Math.max(1, trees.length - 1)),
        trees.length - 1
      ),
      movieTimeMs: boundedTime,
    };
  };

  return {
    timeline: { totalDuration, cursorAt: getCursorAtMovieTime, cursorForFrame },
    frameAt: (movieTimeMs) => {
      const boundedProgress = Math.max(0, Math.min(1, movieTimeMs / totalDuration));
      const scaledProgress = boundedProgress * Math.max(1, trees.length - 1);
      const sourceTreeIndex = Math.min(Math.floor(scaledProgress), trees.length - 2);
      const targetTreeIndex = sourceTreeIndex + 1;
      const transitionProgress = boundedProgress === 1 ? 1 : scaledProgress - sourceTreeIndex;

      return TransitionFrame.from({
        sourceTree: trees[sourceTreeIndex],
        targetTree: trees[targetTreeIndex],
        sourceTreeIndex,
        targetTreeIndex,
        transitionProgress,
      });
    },
  };
}

function createSemanticRunnerState(trees, { stepDurationMs = 2000, ...overrides } = {}) {
  return {
    playing: true,
    animationStartTime: 1000,
    animationSpeed: 1,
    treeList: trees,
    ...createSemanticRunnerTimeline(trees, stepDurationMs),
    comparisonMode: false,
    ...overrides,
  };
}

const originalEnsureTreesHydrated = useAppStore.getState().ensureTreesHydrated;
const originalUpdateColorManagerForIndex = useAppStore.getState().updateColorManagerForIndex;

const resetStore = () =>
  useAppStore.setState({
    playing: false,
    timelineCursor: null,
    animationStartTime: null,
    animationSpeed: 1,
    frameIndex: 0,
    treeList: [],
    treeController: null,
    comparisonMode: false,
    timeline: null,
    timelineView: null,
    isScrubbing: false,
    hoveredSegment: null,
    selectedTimelineSegmentIndex: null,
    ensureTreesHydrated: originalEnsureTreesHydrated,
    updateColorManagerForIndex: originalUpdateColorManagerForIndex,
  });

function flushMicrotasks() {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

describe('TimelineController', () => {
  let movieData;
  let timeline;
  const createController = () => new TimelineController(useAppStore);

  before(() => {
    movieData = loadMovieData();
    timeline = buildTimeline(movieData);
  });

  beforeEach(() => {
    useAppStore.setState({
      timeline,
      treeList: movieData.interpolated_trees,
      timelineFrames: movieData.frames,
    });
  });

  afterEach(resetStore);

  it('can exist before a host container is available', () => {
    const controller = createController();

    expect(controller.view).to.equal(null);
    expect(controller.container).to.equal(null);
  });

  it('resolves timeline frames through hydration instead of treating sparse treeList as invalid', () => {
    const treeList = new Array(movieData.interpolated_trees.length);
    const hydratedIndices = [];
    useAppStore.setState({
      treeList,
      ensureTreesHydrated: (indices) => {
        hydratedIndices.push(indices);
        return indices.map((index) => {
          treeList[index] = movieData.interpolated_trees[index];
          return treeList[index];
        });
      },
    });

    const step = timeline.steps.find((item) => item.to === 1 && item.from !== 1);
    const frame = useAppStore.getState().frameAt((step.start + step.end) / 2);

    expect(hydratedIndices).to.not.deep.equal([]);
    expect(frame.sourceTree).to.equal(movieData.interpolated_trees[0]);
    expect(frame.targetTree).to.equal(movieData.interpolated_trees[1]);
  });

  it('hydrates a sparse target tree when the source frame is already hydrated', () => {
    const treeList = new Array(movieData.interpolated_trees.length);
    treeList[0] = movieData.interpolated_trees[0];
    const hydratedIndices = [];
    useAppStore.setState({
      treeList,
      ensureTreesHydrated: (indices) => {
        hydratedIndices.push(indices);
        return indices.map((index) => {
          treeList[index] = movieData.interpolated_trees[index];
          return treeList[index];
        });
      },
    });

    const step = timeline.steps.find((item) => item.to === 1 && item.from !== 1);
    const frame = useAppStore.getState().frameAt((step.start + step.end) / 2);

    expect(hydratedIndices).to.deep.equal([[0, 1]]);
    expect(frame.sourceTree).to.equal(movieData.interpolated_trees[0]);
    expect(frame.targetTree).to.equal(movieData.interpolated_trees[1]);
    expect(frame.isStatic).to.equal(false);
  });

  it('mounts into an explicit host and unmounts cleanly', async () => {
    const controller = createController();
    const host = makeContainer();

    await controller.mount(host);

    expect(controller.container).to.equal(host);
    expect(controller.view.container).to.equal(host);
    expect(useAppStore.getState().timelineView).to.equal(controller.view);
    expect(host.children.length).to.equal(1);

    controller.unmount();

    expect(controller.view).to.equal(null);
    expect(controller.container).to.equal(null);
    expect(useAppStore.getState().timelineView).to.equal(null);
    expect(host.children.length).to.equal(0);
  });

  it('remounts into a new host without leaving stale DOM behind', async () => {
    const controller = createController();
    const firstHost = makeContainer(640, 60);
    const secondHost = makeContainer(720, 90);

    await controller.mount(firstHost);
    expect(firstHost.children.length).to.equal(1);

    await controller.mount(secondHost);

    expect(firstHost.children.length).to.equal(0);
    expect(secondHost.children.length).to.equal(1);
    expect(controller.container).to.equal(secondHost);
    expect(controller.view.container).to.equal(secondHost);

    controller.unmount();
  });

  it('drops a view that finishes loading after the strip was unmounted', async () => {
    const controller = createController();
    const host = makeContainer();

    const pending = controller.mount(host);
    controller.unmount();

    expect(await pending).to.equal(null);
    expect(controller.view).to.equal(null);
    expect(useAppStore.getState().timelineView).to.equal(null);
    expect(host.children.length).to.equal(0);
  });

  it('treats a second unmount as a no-op', async () => {
    const controller = createController();
    await controller.mount(makeContainer());

    controller.unmount();

    expect(() => controller.unmount()).to.not.throw();
    expect(controller.view).to.equal(null);
    expect(controller.container).to.equal(null);
  });

  it('clears transient tooltip and hover state on unmount', () => {
    const controller = createController();
    const host = makeContainer();

    useAppStore.setState({ hoveredSegment: { index: 2, x: 120 } });

    controller.mount(host);
    controller.unmount();

    expect(useAppStore.getState().hoveredSegment).to.equal(null);
  });

  it('stores clicked timeline selection by segment index only', () => {
    const controller = createController();

    controller.select(1, 0);

    const state = useAppStore.getState();
    expect(state.selectedTimelineSegmentIndex).to.equal(1);
    expect(Object.prototype.hasOwnProperty.call(state, 'selectedTimelineSegmentData')).to.equal(
      false
    );
  });

  it('clears selected timeline segment on dataset reset', () => {
    useAppStore.setState({ selectedTimelineSegmentIndex: 2 });

    useAppStore.getState().reset();

    const state = useAppStore.getState();
    expect(state.selectedTimelineSegmentIndex).to.equal(null);
    expect(Object.prototype.hasOwnProperty.call(state, 'selectedTimelineSegmentData')).to.equal(
      false
    );
  });

  it('keeps clicked inspector selection visually pinned while cursor sync changes current position', async () => {
    const controller = createController();
    const cursor = timeline.cursorAt(0.9 * timeline.totalDuration);

    useAppStore.setState({
      selectedTimelineSegmentIndex: 0,
      playing: true,
      timelineCursor: cursor,
    });

    await controller.mount(makeContainer());
    controller.syncPosition();

    expect(controller.view.selected).to.equal(0);
    expect(useAppStore.getState().selectedTimelineSegmentIndex).to.equal(0);

    controller.unmount();
  });

  it('restores scrubber position and inspected segment selection on remount from store state', async () => {
    const controller = createController();
    const cursor = timeline.cursorAt(0.6 * timeline.totalDuration);

    useAppStore.setState({
      playing: false,
      timelineCursor: cursor,
      selectedTimelineSegmentIndex: 2,
    });

    await controller.mount(makeContainer(640, 60));

    const firstScrubberMs = controller.view.scrubberMs;
    expect(firstScrubberMs).to.equal(cursor.movieTimeMs);
    expect(controller.view.selected).to.equal(2);

    controller.unmount();
    await controller.mount(makeContainer(640, 60));

    expect(controller.view.scrubberMs).to.equal(firstScrubberMs);
    expect(controller.view.selected).to.equal(2);

    controller.unmount();
  });

  it('syncs the strip selection when the store selection is cleared', async () => {
    const controller = createController();

    useAppStore.setState({ selectedTimelineSegmentIndex: 1 });
    await controller.mount(makeContainer());

    expect(controller.view.selected).to.equal(1);

    useAppStore.setState({ selectedTimelineSegmentIndex: null });

    expect(controller.view.selected).to.equal(null);

    controller.unmount();
  });

  it('coalesces repeated position updates into one pending frame', () => {
    const previousRequestAnimationFrame = global.requestAnimationFrame;
    const previousCancelAnimationFrame = global.cancelAnimationFrame;
    const frameCallbacks = [];
    let scheduledCount = 0;

    global.requestAnimationFrame = (callback) => {
      scheduledCount += 1;
      frameCallbacks.push(callback);
      return scheduledCount;
    };
    global.cancelAnimationFrame = () => {};

    try {
      const controller = createController();

      controller.schedulePosition();
      controller.schedulePosition();
      controller.schedulePosition();

      expect(scheduledCount).to.equal(1);

      frameCallbacks.pop()(1_000);
      scheduledCount = 0;

      controller.schedulePosition();

      expect(scheduledCount).to.equal(1);
    } finally {
      global.requestAnimationFrame = previousRequestAnimationFrame;
      global.cancelAnimationFrame = previousCancelAnimationFrame;
    }
  });

  it('draws the store scrub state on the strip', async () => {
    const controller = createController();

    await controller.mount(makeContainer());
    expect(controller.view.scrubbing).to.equal(false);

    controller.startScrub(0);
    expect(controller.view.scrubbing).to.equal(true);

    controller.unmount();
    expect(useAppStore.getState().isScrubbing).to.equal(false);
  });

  it('writes the hovered segment and its tooltip anchor to the store and draws it back', async () => {
    const controller = createController();
    await controller.mount(makeContainer());
    const { view } = controller;

    view.canvas.dispatchEvent(
      new global.window.PointerEvent('pointermove', {
        bubbles: true,
        clientX: 5,
        clientY: 10,
        pointerType: 'mouse',
      })
    );

    expect(useAppStore.getState().hoveredSegment).to.deep.equal({ index: 0, x: view.anchorX(0) });
    expect(view.hovered).to.equal(0);

    controller.unmount();
  });

  it('writes the hovered segment to the store once while the pointer stays over it', async () => {
    const controller = createController();
    await controller.mount(makeContainer());
    const { canvas } = controller.view;
    const moveTo = (clientX) =>
      canvas.dispatchEvent(
        new global.window.PointerEvent('pointermove', {
          bubbles: true,
          clientX,
          pointerType: 'mouse',
        })
      );
    let writes = 0;
    const unsubscribe = useAppStore.subscribe(() => (writes += 1));

    moveTo(5);
    moveTo(6);
    moveTo(7);
    expect(writes).to.equal(1);

    moveTo(790);
    expect(writes).to.equal(2);
    expect(useAppStore.getState().hoveredSegment.index).to.be.above(0);

    unsubscribe();
    controller.unmount();
  });

  it('starts and ends a scrub from handle gestures', async () => {
    const controller = createController();
    await controller.mount(makeContainer());

    const pointer = (type) =>
      controller.view.canvas.dispatchEvent(
        new global.window.PointerEvent(type, {
          bubbles: true,
          clientX: 5,
          clientY: 10,
          pointerId: 1,
        })
      );
    pointer('pointerdown');
    expect(useAppStore.getState().isScrubbing).to.equal(true);

    pointer('pointerup');
    await flushMicrotasks();
    expect(useAppStore.getState().isScrubbing).to.equal(false);

    controller.unmount();
  });

  describe('clicking the strip', () => {
    const scheduledFrames = [];
    let originalRequestAnimationFrame;

    beforeEach(() => {
      originalRequestAnimationFrame = global.requestAnimationFrame;
      global.requestAnimationFrame = (cb) => scheduledFrames.push(cb);
    });

    afterEach(() => {
      scheduledFrames.length = 0;
      global.requestAnimationFrame = originalRequestAnimationFrame;
    });

    // A store double: just what select() reads and writes.
    function makeStore({ segments, cursorAt }) {
      const state = {
        timeline: { segments, cursorAt },
        timelineCursor: { movieTimeMs: 1234 },
        goToPositionCalls: [],
        setClipboardTreeIndexCalls: [],
        selected: [],
        goToPosition: (position, direction, options) =>
          state.goToPositionCalls.push({ position, direction, options }),
        setClipboardTreeIndex: (index) => state.setClipboardTreeIndexCalls.push(index),
        setSelectedTimelineSegment: (index) => state.selected.push(index),
      };
      return { getState: () => state };
    }

    const transition = (firstFrame, lastFrame) => ({
      isInputTreeSegment: false,
      firstFrame,
      lastFrame,
      start: 0,
      end: 3000,
    });
    const cursorOnFrame = (frameIndex) => (movieTimeMs) => ({
      frameIndex,
      segmentIndex: 0,
      movieTimeMs,
    });

    it('moves to a clicked input tree without pinning it', () => {
      const store = makeStore({
        segments: [{ isInputTreeSegment: true, firstFrame: 4, lastFrame: 4, start: 0, end: 1500 }],
        cursorAt: cursorOnFrame(4),
      });
      const controller = new TimelineController(store);
      const setCustomTimeCalls = [];
      controller.view = { setCustomTime: (ms) => setCustomTimeCalls.push(ms) };

      controller.select(0, 700);

      const state = store.getState();
      expect(state.selected).to.deep.equal([0]);
      expect(state.setClipboardTreeIndexCalls).to.deep.equal([]);
      expect(state.goToPositionCalls).to.deep.equal([
        { position: 4, direction: 'jump', options: { movieTimeMs: 700 } },
      ]);
      expect(scheduledFrames).to.have.length(1);

      scheduledFrames[0]();
      expect(setCustomTimeCalls).to.deep.equal([1234]);
    });

    it('navigates to transition segments without updating the clipboard', () => {
      const store = makeStore({ segments: [transition(2, 2)], cursorAt: cursorOnFrame(2) });

      new TimelineController(store).select(0, 1000);

      expect(store.getState().setClipboardTreeIndexCalls).to.deep.equal([]);
      expect(store.getState().goToPositionCalls).to.deep.equal([
        { position: 2, direction: 'jump', options: { movieTimeMs: 1000 } },
      ]);
    });

    it('uses click time to resolve the nearest transition frame', () => {
      const store = makeStore({
        segments: [transition(2, 4)],
        cursorAt: (movieTimeMs) => ({
          frameIndex: movieTimeMs < 2250 ? 3 : 4,
          segmentIndex: 0,
          movieTimeMs,
        }),
      });

      new TimelineController(store).select(0, 2600);

      expect(store.getState().goToPositionCalls).to.deep.equal([
        { position: 4, direction: 'jump', options: { movieTimeMs: 2600 } },
      ]);
    });

    it('keeps a boundary click inside the clicked segment', () => {
      const asked = [];
      const store = makeStore({
        segments: [transition(2, 4)],
        cursorAt: (movieTimeMs) => {
          asked.push(movieTimeMs);
          return { frameIndex: 4, segmentIndex: 0, movieTimeMs };
        },
      });

      new TimelineController(store).select(0, 9999);
      new TimelineController(store).select(0, -50);

      expect(asked).to.deep.equal([2999, 1]);
    });
  });

  describe('scrubbing', () => {
    // Two motions of the movie, and a time inside one of them.
    const [first, second] = buildTimeline(loadMovieData()).steps.filter(
      (step) => step.from !== step.to
    );
    const at = (step, progress) => step.start + progress * (step.end - step.start);

    let originalRequestAnimationFrame;
    let originalCancelAnimationFrame;

    beforeEach(() => {
      originalRequestAnimationFrame = global.requestAnimationFrame;
      originalCancelAnimationFrame = global.cancelAnimationFrame;
    });

    afterEach(() => {
      global.requestAnimationFrame = originalRequestAnimationFrame;
      global.cancelAnimationFrame = originalCancelAnimationFrame;
    });

    // Frames run only when the test says so; returns the function that runs the pending ones.
    const holdFrames = () => {
      const pending = new Map();
      let lastId = 0;
      global.requestAnimationFrame = (callback) => pending.set(++lastId, callback) && lastId;
      global.cancelAnimationFrame = (id) => pending.delete(id);
      return () => {
        const callbacks = [...pending.values()];
        pending.clear();
        callbacks.forEach((callback) => callback(0));
      };
    };

    it('does not block the strip on slow tree renders', async () => {
      const runFrame = holdFrames();
      const renders = [];
      useAppStore.setState({
        treeController: {
          renderAllElements: () => {},
          renderComparisonAwareScrubFrame: (...args) => {
            renders.push(args);
            return new Promise(() => {});
          },
        },
      });
      const controller = createController();

      controller.startScrub(0);
      controller.scrub(at(first, 0.5));
      runFrame();
      await flushMicrotasks();

      expect(renders).to.have.length(1);
      expect(renders[0][3]).to.include({ fromTreeIndex: first.from, toTreeIndex: first.to });
    });

    it('renders a drag once per frame, at its latest position', async () => {
      const runFrame = holdFrames();
      const renders = [];
      useAppStore.setState({
        treeController: {
          renderAllElements: () => {},
          renderComparisonAwareScrubFrame: async (...args) => {
            renders.push(args);
          },
        },
      });
      const controller = createController();

      controller.startScrub(0);
      controller.scrub(at(first, 0.2));
      controller.scrub(at(first, 0.4));
      controller.scrub(at(first, 0.6));
      await flushMicrotasks();
      expect(renders).to.have.length(0);

      runFrame();
      await flushMicrotasks();
      expect(renders).to.have.length(1);
      expect(renders[0][2]).to.be.closeTo(0.6, 1e-6);

      controller.scrub(at(second, 0.5));
      runFrame();
      await flushMicrotasks();
      expect(renders).to.have.length(2);
    });

    it('cancels a scheduled stale scrub update before flushing the final position', async () => {
      let rafCallback = null;
      let cancelledFrameId = null;
      global.requestAnimationFrame = (callback) => {
        rafCallback = callback;
        return 7;
      };
      global.cancelAnimationFrame = (frameId) => {
        cancelledFrameId = frameId;
      };
      const renderedTimes = [];
      useAppStore.setState({
        treeController: {
          renderAllElements: () => {},
          renderComparisonAwareScrubFrame: async () => {
            renderedTimes.push(useAppStore.getState().timelineCursor.movieTimeMs);
          },
        },
      });
      const controller = createController();

      controller.startScrub(0);
      controller.scrub(at(first, 0.2));

      expect(rafCallback).to.be.a('function');
      expect(renderedTimes).to.deep.equal([]);

      await controller.endScrub(at(second, 0.5));

      expect(cancelledFrameId).to.equal(7);
      expect(renderedTimes).to.deep.equal([at(second, 0.5)]);
      expect(useAppStore.getState().timelineCursor.movieTimeMs).to.equal(at(second, 0.5));
    });

    it('ends the scrub before the final cursor write so the tree controller renders it', async () => {
      const scrubbingAtWrite = [];
      const unsubscribe = useAppStore.subscribe((state, prevState) => {
        if (state.timelineCursor !== prevState.timelineCursor) {
          scrubbingAtWrite.push(state.isScrubbing);
        }
      });
      const controller = createController();

      controller.startScrub(0);
      await controller.endScrub(at(second, 0.5));
      unsubscribe();

      expect(scrubbingAtWrite).to.deep.equal([false]);
    });

    it('leaves the change pulse off where the released scrub rests on a pivot edge', async () => {
      useAppStore.setState({
        temporalEvents: movieData.temporal_events,
        treeController: {
          renderAllElements: () => {},
          renderComparisonAwareScrubFrame: async () => {},
        },
      });
      useAppStore.getState().initializeColors();
      await flushMicrotasks();
      const { steps } = timeline;
      const hasPivot = (frame) => useAppStore.getState().getCurrentPivotEdge(frame).length > 0;
      const intoPivotFrame = steps.find((s) => s.from !== s.to && hasPivot(s.to));
      const controller = createController();

      try {
        controller.startScrub(0);
        await controller.endScrub(at(intoPivotFrame, 0.5));

        // Paused: the highlight rests at full strength instead of animating.
        expect(useAppStore.getState().pulseController?.isRunning === true).to.equal(false);
        expect(useAppStore.getState().getPulseOpacity()).to.equal(1);
      } finally {
        useAppStore.getState().resetColors();
        useAppStore.setState({ temporalEvents: [] });
      }
    });

    it('serializes scrub renders and collapses pending updates to the latest movie time', async () => {
      const resolvers = [];
      const renderCalls = [];
      let activeRenderCount = 0;
      let maxActiveRenderCount = 0;
      useAppStore.setState({
        treeController: {
          renderAllElements: () => {},
          renderComparisonAwareScrubFrame: async (fromTree, toTree, timeFactor, options) => {
            activeRenderCount += 1;
            maxActiveRenderCount = Math.max(maxActiveRenderCount, activeRenderCount);
            renderCalls.push({ fromTree, toTree, timeFactor, options });

            await new Promise((resolve) => {
              resolvers.push(() => {
                activeRenderCount -= 1;
                resolve();
              });
            });
          },
        },
      });
      const controller = createController();

      const firstUpdate = controller.renderScrub(at(first, 0.4));
      const secondUpdate = controller.renderScrub(at(second, 0.2));
      const thirdUpdate = controller.renderScrub(at(second, 0.6));

      await flushMicrotasks();

      expect(renderCalls).to.have.length(1);
      expect(maxActiveRenderCount).to.equal(1);

      resolvers.shift()();
      await flushMicrotasks();

      expect(renderCalls).to.have.length(2);
      expect(maxActiveRenderCount).to.equal(1);
      expect(renderCalls[1].options.fromTreeIndex).to.equal(second.from);
      expect(renderCalls[1].options.toTreeIndex).to.equal(second.to);
      expect(renderCalls[1].timeFactor).to.be.closeTo(0.6, 1e-6);

      resolvers.shift()();
      await Promise.all([firstUpdate, secondUpdate, thirdUpdate]);

      const { timelineCursor, frameIndex } = useAppStore.getState();
      expect(timelineCursor.movieTimeMs).to.equal(at(second, 0.6));
      expect(frameIndex).to.equal(second.to);
    });

    it('uses target-frame highlights as soon as scrubbed transition motion begins', async () => {
      const highlightIndices = [];
      useAppStore.setState({
        treeController: {
          renderAllElements: () => {},
          renderComparisonAwareScrubFrame: async () => {},
        },
        updateColorManagerForIndex: (treeIndex) => highlightIndices.push(treeIndex),
      });
      const controller = createController();

      await controller.renderScrub(at(first, 0.2));

      expect(highlightIndices).to.deep.equal([first.to]);
    });

    it('hydrates missing transition-frame trees before rendering scrub frames', async () => {
      const [hydratedSource, hydratedTarget] = movieData.interpolated_trees;
      const hydratedIndices = [];
      const renderCalls = [];
      useAppStore.setState({
        treeList: [],
        treeController: {
          renderAllElements: () => {},
          renderComparisonAwareScrubFrame: async (...args) => {
            renderCalls.push(args);
          },
        },
        ensureTreesHydrated: (indices) => {
          hydratedIndices.push(indices);
          return [hydratedSource, hydratedTarget];
        },
      });
      const controller = createController();

      await controller.renderScrub(at(first, 0.5));

      expect(hydratedIndices).to.deep.equal([[first.from, first.to]]);
      expect(renderCalls[0][0]).to.equal(hydratedSource);
      expect(renderCalls[0][1]).to.equal(hydratedTarget);
    });

    it('flushes the latest requested movie time before ending a scrub', async () => {
      const resolvers = [];
      useAppStore.setState({
        treeController: {
          renderAllElements: () => {},
          renderComparisonAwareScrubFrame: () =>
            new Promise((resolve) => {
              resolvers.push(resolve);
            }),
        },
      });
      const controller = createController();
      controller.startScrub(0);

      const updatePromise = controller.renderScrub(at(first, 0.4));
      const endPromise = controller.endScrub(at(second, 0.8));

      await flushMicrotasks();

      expect(resolvers).to.have.length(1);
      resolvers.shift()();
      await flushMicrotasks();
      expect(resolvers).to.have.length(1);

      resolvers.shift()();
      await updatePromise;
      await endPromise;

      const { timelineCursor, isScrubbing } = useAppStore.getState();
      expect(timelineCursor.movieTimeMs).to.equal(at(second, 0.8));
      expect(isScrubbing).to.equal(false);
    });

    it('reports scrub render failures without throwing away the scrub session', async () => {
      const renderError = new Error('render failed');
      const originalError = console.error;
      const errorCalls = [];
      console.error = (...args) => {
        errorCalls.push(args);
      };

      try {
        useAppStore.setState({
          treeController: {
            renderAllElements: () => {},
            renderComparisonAwareScrubFrame: async () => {
              throw renderError;
            },
          },
        });
        const controller = createController();
        controller.startScrub(0);

        await controller.renderScrub(at(first, 0.5));
        await controller.endScrub(at(first, 0.5));

        expect(errorCalls).to.have.length(1);
        expect(errorCalls[0][0]).to.equal('[TimelineController] Scrub update failed:');
        expect(errorCalls[0][1]).to.deep.include({
          movieTimeMs: at(first, 0.5),
          error: renderError,
        });
        expect(useAppStore.getState().timelineCursor.movieTimeMs).to.equal(at(first, 0.5));
      } finally {
        console.error = originalError;
      }
    });

    it('uses timeline frames for comparison scrub input trees', async () => {
      const renderCalls = [];
      useAppStore.setState({
        comparisonMode: true,
        treeController: {
          renderAllElements: () => {},
          renderComparisonAwareScrubFrame: async (...args) => {
            renderCalls.push(args);
          },
        },
      });
      const controller = createController();

      await controller.renderScrub(at(first, 0.4));

      const rightTreeIndex = selectInputFrameIndices(useAppStore.getState()).find(
        (index) => index > first.from
      );
      expect(rightTreeIndex).to.be.a('number');
      expect(renderCalls[0][3]).to.include({ comparisonMode: true, rightTreeIndex });
    });

    it('does not fall back to linear interpolation without a timeline transition frame', async () => {
      const renderCalls = [];
      useAppStore.setState({
        timeline: null,
        treeController: {
          renderAllElements: () => {},
          renderComparisonAwareScrubFrame: async (...args) => {
            renderCalls.push(args);
          },
        },
      });
      const controller = createController();

      await controller.renderScrub(at(first, 0.5));

      expect(renderCalls).to.deep.equal([]);
    });
  });
});

describe('timeline playback', () => {
  afterEach(resetStore);

  it('resumes from the exact semantic movie position after scrubbing', () => {
    const previousPerformance = global.performance;
    const now = 10_000;
    global.performance = {
      ...(previousPerformance || {}),
      now: () => now,
    };

    try {
      const trees = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }, { id: 'e' }];
      const { timeline } = createSemanticRunnerTimeline(trees);
      const cursor = timeline.cursorAt(1250);

      useAppStore.setState({
        treeList: trees,
        timeline,
        animationSpeed: 1,
        timelineCursor: cursor,
        playing: false,
      });

      useAppStore.getState().play();

      const state = useAppStore.getState();
      expect(state.timelineCursor).to.deep.equal(cursor);
      expect(state.timelineCursor.movieTimeMs).to.equal(1250);
      expect(state.frameIndex).to.equal(1);
      expect(state.animationStartTime).to.equal(now - 1250);
    } finally {
      global.performance = previousPerformance;
    }
  });

  it('uses semantic movie timeline duration when advancing animation frames', async () => {
    const trees = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }];
    let movieTimeSeen = null;
    let cacheIndices = null;
    let renderOptions = null;
    let syncedMeta = null;
    const timelineState = {
      timeline: { totalDuration: 4100 },
      frameAt: (movieTimeMs) => {
        movieTimeSeen = movieTimeMs;
        return TransitionFrame.from({
          sourceTree: trees[1],
          targetTree: trees[1],
          sourceTreeIndex: 1,
          targetTreeIndex: 1,
          transitionProgress: 0,
          holdKind: 'mover',
        });
      },
    };

    const runner = new AnimationRunner({
      getState: () => ({
        playing: true,
        animationStartTime: 1_000,
        animationSpeed: 1,
        treeList: trees,
        ...timelineState,
        comparisonMode: false,
      }),
      getOrCacheInterpolationData: (_fromTree, _toTree, fromIndex, toIndex) => {
        cacheIndices = { fromIndex, toIndex };
        return {
          dataFrom: { nodes: [] },
          dataTo: { nodes: [] },
        };
      },
      renderSingleFrame: async (_fromTree, _toTree, _easedT, options) => {
        renderOptions = options;
      },
      renderComparisonFrame: async () => {},
      setAnimationStage: () => {},
      updateProgress: (playback) => {
        syncedMeta = playback;
      },
      stopAnimation: () => {},
    });

    runner.isRunning = true;
    const shouldStop = await runner._processFrame(2_100);

    expect(shouldStop).to.equal(false);
    expect(movieTimeSeen).to.equal(1100);
    expect(cacheIndices).to.deep.equal({ fromIndex: 1, toIndex: 1 });
    expect(renderOptions.fromTreeIndex).to.equal(1);
    expect(renderOptions.toTreeIndex).to.equal(1);
    expect(renderOptions.rawTimeFactor).to.equal(0);
    expect(syncedMeta.movieTimeMs).to.equal(1100);
    expect(syncedMeta.transitionFrame.holdKind).to.equal('mover');
  });

  it('syncs playback progress before building interpolation layout data', async () => {
    const callOrder = [];

    const runner = new AnimationRunner({
      getState: () => createSemanticRunnerState([{ id: 'a' }, { id: 'b' }]),
      getOrCacheInterpolationData: () => {
        callOrder.push('layout');
        return {
          dataFrom: { nodes: [] },
          dataTo: { nodes: [] },
        };
      },
      renderSingleFrame: async () => {},
      renderComparisonFrame: async () => {},
      setAnimationStage: () => {},
      updateProgress: () => {
        callOrder.push('progress');
      },
      stopAnimation: () => {},
    });

    runner.isRunning = true;
    await runner._processFrame(2_000);

    expect(callOrder).to.deep.equal(['progress', 'layout']);
  });

  it('defers first playback render so cursor movement is not blocked by layout', async () => {
    const callOrder = [];

    const runner = new AnimationRunner({
      getState: () => createSemanticRunnerState([{ id: 'a' }, { id: 'b' }]),
      getOrCacheInterpolationData: () => {
        callOrder.push('layout');
        return {
          dataFrom: { nodes: [] },
          dataTo: { nodes: [] },
        };
      },
      renderSingleFrame: async () => {
        callOrder.push('render');
      },
      renderComparisonFrame: async () => {},
      setAnimationStage: () => {},
      updateProgress: () => {
        callOrder.push('progress');
      },
      stopAnimation: () => {},
    });

    runner.isRunning = true;
    runner._deferRenderUntilNextFrame = true;
    await runner._processFrame(2_000);

    expect(callOrder).to.deep.equal(['progress']);

    await runner._processFrame(2_020);

    expect(callOrder).to.deep.equal(['progress', 'layout', 'render']);
  });

  it('syncs highlight state to the rendered playback frame before drawing', async () => {
    const highlightIndices = [];
    const renderOrder = [];

    const runner = new AnimationRunner({
      getState: () => createSemanticRunnerState([{ id: 'a' }, { id: 'b' }]),
      getOrCacheInterpolationData: () => ({
        dataFrom: { nodes: [] },
        dataTo: { nodes: [] },
      }),
      renderSingleFrame: async () => {
        renderOrder.push('render');
      },
      renderComparisonFrame: async () => {},
      setAnimationStage: () => {},
      syncHighlightsForIndex: (treeIndex) => {
        highlightIndices.push(treeIndex);
        renderOrder.push('sync');
      },
      updateProgress: () => {},
      stopAnimation: () => {},
    });

    runner.isRunning = true;
    await runner._processFrame(2_100);

    expect(highlightIndices).to.deep.equal([1]);
    expect(renderOrder).to.deep.equal(['sync', 'render']);
  });

  it('syncs target-frame highlights as soon as transition motion begins', async () => {
    const highlightIndices = [];

    const runner = new AnimationRunner({
      getState: () => createSemanticRunnerState([{ id: 'a' }, { id: 'b' }]),
      getOrCacheInterpolationData: () => ({
        dataFrom: { nodes: [] },
        dataTo: { nodes: [] },
      }),
      renderSingleFrame: async () => {},
      renderComparisonFrame: async () => {},
      setAnimationStage: () => {},
      syncHighlightsForIndex: (treeIndex) => highlightIndices.push(treeIndex),
      updateProgress: () => {},
      stopAnimation: () => {},
    });

    runner.isRunning = true;
    await runner._processFrame(1_100);

    expect(highlightIndices).to.deep.equal([1]);
  });

  it('recomputes animation stage when interpolation data changes for the same tree indices', async () => {
    const renderedTValues = [];
    let callCount = 0;

    const runner = new AnimationRunner({
      getState: () => createSemanticRunnerState([{ id: 'a' }, { id: 'b' }]),
      getOrCacheInterpolationData: () => {
        callCount += 1;
        if (callCount === 1) {
          return {
            dataFrom: { layoutCacheKey: 'from-1', nodes: [{ id: 'node-a' }] },
            dataTo: { layoutCacheKey: 'to-1', nodes: [{ id: 'node-a' }] },
          };
        }

        return {
          dataFrom: { layoutCacheKey: 'from-2', nodes: [{ id: 'node-a' }, { id: 'node-b' }] },
          dataTo: { layoutCacheKey: 'to-2', nodes: [{ id: 'node-a' }] },
        };
      },
      renderSingleFrame: async (_fromTree, _toTree, easedT) => {
        renderedTValues.push(easedT);
      },
      renderComparisonFrame: async () => {},
      setAnimationStage: () => {},
      updateProgress: () => {},
      stopAnimation: () => {},
    });

    runner.isRunning = true;
    await runner._processFrame(1_500);
    await runner._processFrame(1_500);

    expect(renderedTValues).to.have.lengthOf(2);
    expect(renderedTValues[0]).to.equal(0.0625);
    expect(renderedTValues[1]).to.equal(renderedTValues[0]);
  });

  it('uses transition lifecycle data when choosing the playback animation stage', async () => {
    const stages = [];
    const renderedTValues = [];
    let callCount = 0;

    const runner = new AnimationRunner({
      getState: () => createSemanticRunnerState([{ id: 'a' }, { id: 'b' }]),
      getOrCacheInterpolationData: () => {
        callCount += 1;
        return {
          dataFrom: { layoutCacheKey: 'from', nodes: [{ id: 'node-a' }] },
          dataTo: { layoutCacheKey: 'to', nodes: [{ id: 'node-a' }] },
          transitionChangeModel:
            callCount === 1
              ? {
                  linkChanges: new Map([['zeroing-1', { lifecycle: 'zeroing' }]]),
                  hasLifecycleChanges: true,
                }
              : null,
        };
      },
      renderSingleFrame: async (_fromTree, _toTree, easedT) => {
        renderedTValues.push(easedT);
      },
      renderComparisonFrame: async () => {},
      setAnimationStage: (nextStage) => {
        stages.push(nextStage);
      },
      updateProgress: () => {},
      stopAnimation: () => {},
    });

    runner.isRunning = true;
    await runner._processFrame(1_500);
    await runner._processFrame(1_500);

    expect(stages).to.deep.equal(['COLLAPSE', 'REORDER']);
    expect(renderedTValues[1]).to.be.at.least(renderedTValues[0]);
  });

  it('renders zeroing lifecycle frames with trees returned by immutable hydration', async () => {
    const sourceTree = { id: 'source-tree' };
    const targetTree = { id: 'target-tree' };
    const transitionChangeModel = {
      linkChanges: new Map([['zeroing-1', { lifecycle: 'zeroing' }]]),
      hasLifecycleChanges: true,
    };
    const state = {
      playing: true,
      animationStartTime: 1_000,
      animationSpeed: 1,
      treeList: [sourceTree, undefined],
      comparisonMode: false,
      ensureTreesHydrated: sinon.spy((indices) =>
        indices.map((index) => (index === 0 ? sourceTree : targetTree))
      ),
    };
    state.timeline = { totalDuration: 2000 };
    state.frameAt = (movieTimeMs) => {
      const [hydratedSource, hydratedTarget] = state.ensureTreesHydrated([0, 1]);
      return TransitionFrame.from({
        sourceTree: hydratedSource,
        targetTree: hydratedTarget,
        sourceTreeIndex: 0,
        targetTreeIndex: 1,
        transitionProgress: movieTimeMs / 2000,
      });
    };
    const renderedFrames = [];

    const runner = new AnimationRunner({
      getState: () => state,
      getOrCacheInterpolationData: (fromTree, toTree) => {
        expect(fromTree).to.equal(sourceTree);
        expect(toTree).to.equal(targetTree);
        return {
          dataFrom: { layoutCacheKey: 'from', nodes: [{ id: 'node-a' }] },
          dataTo: { layoutCacheKey: 'to', nodes: [{ id: 'node-a' }] },
          transitionChangeModel,
        };
      },
      renderSingleFrame: async (fromTree, toTree, easedT, options) => {
        renderedFrames.push({ fromTree, toTree, easedT, options });
      },
      renderComparisonFrame: async () => {},
      setAnimationStage: () => {},
      updateProgress: () => {},
      stopAnimation: () => {},
    });

    runner.isRunning = true;
    await runner._processFrame(1_500);

    expect(state.ensureTreesHydrated.calledWithMatch([0, 1])).to.equal(true);
    expect(renderedFrames).to.have.lengthOf(1);
    expect(renderedFrames[0].fromTree).to.equal(sourceTree);
    expect(renderedFrames[0].toTree).to.equal(targetTree);
    expect(renderedFrames[0].options.transitionChangeModel).to.equal(transitionChangeModel);
  });

  it('updates playback animation stage by current lifecycle clock phase without moving render progress backward', async () => {
    const stages = [];
    const renderedTValues = [];
    const transitionChangeModel = {
      linkChanges: new Map([
        ['zeroing-1', { lifecycle: 'zeroing' }],
        ['reviving-2', { lifecycle: 'reviving' }],
      ]),
      hasLifecycleChanges: true,
    };

    const runner = new AnimationRunner({
      getState: () =>
        createSemanticRunnerState([{ id: 'a' }, { id: 'b' }], { stepDurationMs: 1000 }),
      getOrCacheInterpolationData: () => ({
        dataFrom: { layoutCacheKey: 'from', nodes: [{ id: 'node-a' }] },
        dataTo: { layoutCacheKey: 'to', nodes: [{ id: 'node-a' }] },
        transitionChangeModel,
      }),
      renderSingleFrame: async (_fromTree, _toTree, easedT) => {
        renderedTValues.push(easedT);
      },
      renderComparisonFrame: async () => {},
      setAnimationStage: (nextStage) => {
        stages.push(nextStage);
      },
      updateProgress: () => {},
      stopAnimation: () => {},
    });

    runner.isRunning = true;
    await runner._processFrame(1_390);
    await runner._processFrame(1_400);
    await runner._processFrame(1_550);
    await runner._processFrame(1_560);

    expect(stages).to.deep.equal(['COLLAPSE', 'REORDER', 'EXPAND']);
    expect(renderedTValues).to.have.lengthOf(4);
    for (let index = 1; index < renderedTValues.length; index += 1) {
      expect(renderedTValues[index]).to.be.at.least(renderedTValues[index - 1]);
    }
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
        getState: () => createSemanticRunnerState([{ id: 'a' }, { id: 'b' }, { id: 'c' }]),
        getOrCacheInterpolationData: () => ({
          dataFrom: { nodes: [] },
          dataTo: { nodes: [] },
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
        },
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
        getState: () => createSemanticRunnerState([{ id: 'a' }, { id: 'b' }, { id: 'c' }]),
        getOrCacheInterpolationData: () => ({
          dataFrom: { nodes: [] },
          dataTo: { nodes: [] },
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
        },
      });

      runner.start();
      const firstProgressFrame = frameCallbacks[0](2_000);
      await firstProgressFrame;
      expect(renderCount).to.equal(0);

      const firstRenderFrame = frameCallbacks[1](2_020);
      await Promise.resolve();
      expect(renderCount).to.equal(1);

      runner.stop();
      runner.start();
      const secondProgressFrame = frameCallbacks[2](2_025);
      await Promise.resolve();

      expect(renderCount).to.equal(1);

      releaseRender();
      await firstRenderFrame;
      await secondProgressFrame;

      expect(redrawCount).to.equal(0);
    } finally {
      global.requestAnimationFrame = previousRequestAnimationFrame;
      global.cancelAnimationFrame = previousCancelAnimationFrame;
    }
  });
});
