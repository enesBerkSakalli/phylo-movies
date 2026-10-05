const { expect } = require('chai');

const scheduledFrames = [];

const {
  TimelineNavigationController,
} = require('../../../src/timeline/core/TimelineNavigationController.js');

describe('TimelineNavigationController', () => {
  let originalRequestAnimationFrame;

  beforeEach(() => {
    originalRequestAnimationFrame = global.requestAnimationFrame;
    global.requestAnimationFrame = (cb) => {
      scheduledFrames.push(cb);
      return scheduledFrames.length;
    };
  });

  afterEach(() => {
    scheduledFrames.length = 0;
    global.requestAnimationFrame = originalRequestAnimationFrame;
  });

  function makeStore(initialState = {}) {
    const state = {
      frameIndex: 0,
      clipboardTreeIndex: null,
      goToPositionCalls: [],
      setClipboardTreeIndexCalls: [],
      ...initialState,
    };

    state.goToPosition = (position, direction, options) => {
      state.goToPositionCalls.push({ position, direction, options });
    };

    state.setClipboardTreeIndex = (index) => {
      state.setClipboardTreeIndexCalls.push(index);
      state.clipboardTreeIndex = index;
    };

    return {
      getState() {
        return state;
      },
    };
  }

  function makeTimeline(segments, cursorAt) {
    return { segments, cumulativeDurations: segments.map(() => 3000), cursorAt };
  }

  it('navigates to input-tree segments and updates the clipboard', () => {
    const store = makeStore({ frameIndex: 1 });
    let updateCalls = 0;
    const controller = new TimelineNavigationController({
      timeline: makeTimeline([{ isInputTreeSegment: true, firstFrame: 4, lastFrame: 4 }]),
      store,
      onTimelinePositionUpdated: () => {
        updateCalls += 1;
      },
    });

    controller.handleTimelineClick(0);

    expect(store.getState().setClipboardTreeIndexCalls).to.deep.equal([4]);
    expect(store.getState().goToPositionCalls).to.deep.equal([
      { position: 4, direction: 'forward', options: undefined },
    ]);
    expect(scheduledFrames).to.have.length(1);

    scheduledFrames[0]();
    expect(updateCalls).to.equal(1);
  });

  it('navigates to transition segments without updating the clipboard', () => {
    const store = makeStore({ frameIndex: 5 });
    const controller = new TimelineNavigationController({
      timeline: makeTimeline([{ isInputTreeSegment: false, firstFrame: 2, lastFrame: 2 }]),
      store,
      onTimelinePositionUpdated: () => {},
    });

    controller.handleTimelineClick(0);

    expect(store.getState().setClipboardTreeIndexCalls).to.deep.equal([]);
    expect(store.getState().goToPositionCalls).to.deep.equal([
      { position: 2, direction: 'backward', options: undefined },
    ]);
  });

  it('uses click time to resolve the nearest transition frame', () => {
    const store = makeStore({ frameIndex: 0 });
    const controller = new TimelineNavigationController({
      timeline: makeTimeline(
        [{ isInputTreeSegment: false, firstFrame: 2, lastFrame: 4 }],
        (movieTimeMs) => ({
          frameIndex: movieTimeMs < 2250 ? 3 : 4,
          segmentIndex: 0,
          movieTimeMs,
        })
      ),
      store,
      onTimelinePositionUpdated: () => {},
    });

    controller.handleTimelineClick(0, 2600);

    expect(store.getState().goToPositionCalls).to.have.length(1);
    expect(store.getState().goToPositionCalls[0]).to.deep.include({
      position: 4,
      direction: 'forward',
    });
    expect(store.getState().goToPositionCalls[0].options).to.deep.equal({ movieTimeMs: 2600 });
  });

  it('uses jump direction and preserves exact timeline position when clicking the already active tree', () => {
    const store = makeStore({ frameIndex: 3 });
    const controller = new TimelineNavigationController({
      timeline: makeTimeline([{ isInputTreeSegment: false, firstFrame: 2, lastFrame: 4 }], () => ({
        frameIndex: 3,
        segmentIndex: 0,
        movieTimeMs: 1500,
      })),
      store,
      onTimelinePositionUpdated: () => {},
    });

    controller.handleTimelineClick(0, 1500);

    expect(store.getState().goToPositionCalls).to.have.length(1);
    expect(store.getState().goToPositionCalls[0]).to.deep.include({
      position: 3,
      direction: 'jump',
    });
    expect(store.getState().goToPositionCalls[0].options).to.deep.equal({ movieTimeMs: 1500 });
  });

  it('throws when a timed click resolves outside its segment', () => {
    const store = makeStore({ frameIndex: 0 });
    const controller = new TimelineNavigationController({
      timeline: makeTimeline([{ isInputTreeSegment: false, firstFrame: 2, lastFrame: 3 }], () => ({
        frameIndex: 3,
        segmentIndex: 1,
        movieTimeMs: 1000,
      })),
      store,
      onTimelinePositionUpdated: () => {},
    });

    expect(() => controller.handleTimelineClick(0, 500)).to.throw(/outside its segment/);
    expect(store.getState().goToPositionCalls).to.deep.equal([]);
  });
});
