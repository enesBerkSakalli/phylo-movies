const { expect } = require('chai');

const { TimelineScrubController } = require('../src/timeline/core/TimelineScrubController.js');

function createController({ scrubberAPI, renderer = null, store = null } = {}) {
  const state = {
    setTimelineProgress: () => {},
  };
  const timelineDataset = {
    getTimelineProgressAtMovieTime: (timeMs) => timeMs / 1000,
    getCursorAtTimelineProgress: (progress) => ({
      frameIndex: Math.round(progress * 10),
    }),
  };

  return new TimelineScrubController({
    timelineDataset,
    timelineData: { totalDuration: 1000 },
    segments: [],
    store: store ?? { getState: () => state },
    getTimelineRenderer: () => renderer,
    getScrubberAPI: () => scrubberAPI,
    stopPlayback: () => {},
  });
}

function flushMicrotasks() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe('TimelineScrubController', () => {
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

  it('does not block timeline mousemove handling on slow tree renders', async () => {
    const updateCalls = [];
    const scrubberAPI = {
      startScrubbing: async () => {},
      updatePosition: (progress) => {
        updateCalls.push(progress);
        return new Promise(() => {});
      },
      endScrubbing: async () => null,
    };
    const controller = createController({ scrubberAPI });

    await controller.startScrubbing(0);
    controller.lastScrubTime = -1000;

    const handlePromise = controller.handleScrubbing(250);
    let settled = false;
    handlePromise.then(() => {
      settled = true;
    });

    await flushMicrotasks();

    expect(settled).to.equal(true);
    expect(updateCalls).to.deep.equal([0.25]);
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

    const updateCalls = [];
    const finalCalls = [];
    const scrubberAPI = {
      startScrubbing: async () => {},
      updatePosition: async (progress) => {
        updateCalls.push(progress);
      },
      endScrubbing: async (progress) => {
        finalCalls.push(progress);
        return {
          transitionFrame: {
            cursorTreeIndex: 9,
          },
        };
      },
    };
    const setTimelineProgressCalls = [];
    const controller = createController({
      scrubberAPI,
      store: {
        getState: () => ({
          setTimelineProgress: (...args) => setTimelineProgressCalls.push(args),
        }),
      },
    });

    await controller.startScrubbing(0);
    controller.lastScrubTime = performance.now();
    controller.updateScrubbing(250);

    expect(rafCallback).to.be.a('function');
    expect(updateCalls).to.deep.equal([]);

    await controller.endScrubbing(900);

    expect(cancelledFrameId).to.equal(7);
    expect(updateCalls).to.deep.equal([]);
    expect(finalCalls).to.deep.equal([0.9]);
    expect(setTimelineProgressCalls).to.deep.equal([[0.9, 9]]);
  });
});
