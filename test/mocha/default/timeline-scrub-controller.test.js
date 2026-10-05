const { expect } = require('chai');

const {
  TimelineScrubController,
} = require('../../../src/timeline/core/TimelineScrubController.js');

function createController({ scrubberAPI, renderer = null, store = null } = {}) {
  const state = {
    seek: () => {},
  };

  return new TimelineScrubController({
    store: store ?? { getState: () => state },
    getTimelineRenderer: () => renderer,
    getScrubberAPI: () => scrubberAPI,
    stopPlayback: () => {},
  });
}

function flushMicrotasks() {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
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
      updatePosition: (movieTimeMs) => {
        updateCalls.push(movieTimeMs);
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
    expect(updateCalls).to.deep.equal([250]);
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
      updatePosition: async (movieTimeMs) => {
        updateCalls.push(movieTimeMs);
      },
      endScrubbing: async (movieTimeMs) => {
        finalCalls.push(movieTimeMs);
        return {
          transitionFrame: {
            cursorTreeIndex: 9,
          },
        };
      },
    };
    const seekCalls = [];
    const controller = createController({
      scrubberAPI,
      store: { getState: () => ({ seek: (...args) => seekCalls.push(args) }) },
    });

    await controller.startScrubbing(0);
    controller.lastScrubTime = performance.now();
    controller.updateScrubbing(250);

    expect(rafCallback).to.be.a('function');
    expect(updateCalls).to.deep.equal([]);

    await controller.endScrubbing(900);

    expect(cancelledFrameId).to.equal(7);
    expect(updateCalls).to.deep.equal([]);
    expect(finalCalls).to.deep.equal([900]);
    expect(seekCalls).to.deep.equal([[900]]);
  });

  it('ends the scrub before the final cursor write so the tree controller renders it', async () => {
    const scrubbingAtSeek = [];
    const controller = createController({
      scrubberAPI: { startScrubbing: async () => {}, endScrubbing: async () => null },
      store: {
        getState: () => ({ seek: () => scrubbingAtSeek.push(controller.isScrubbing) }),
      },
    });

    await controller.startScrubbing(0);
    await controller.endScrubbing(900);

    expect(scrubbingAtSeek).to.deep.equal([false]);
  });
});
