const { expect } = require('chai');

const scheduledFrames = [];

const {
  TimelineNavigationController,
} = require('../src/timeline/core/TimelineNavigationController.js');

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

  function makeTimelineDataset(resolve) {
    return {
      getCursorInSegmentAtMovieTime: (segmentIndex, movieTimeMs) =>
        resolve(movieTimeMs, segmentIndex),
      getSegmentBounds: () => ({ start: 0, end: 3000, duration: 3000 }),
    };
  }

  it('navigates to input-tree segments and updates the clipboard', () => {
    const store = makeStore({ frameIndex: 1 });
    let updateCalls = 0;
    const controller = new TimelineNavigationController({
      segments: [
        {
          index: 0,
          isInputTreeSegment: true,
          interpolationData: [{ originalIndex: 4 }],
        },
      ],
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
      segments: [
        {
          index: 0,
          isInputTreeSegment: false,
          interpolationData: [{ originalIndex: 2 }],
        },
      ],
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
      segments: [
        {
          index: 0,
          isInputTreeSegment: false,
          hasInterpolation: true,
          interpolationData: [{ originalIndex: 2 }, { originalIndex: 3 }, { originalIndex: 4 }],
          timing: [
            { type: 'motion', fromIndex: 2, toIndex: 3, durationMs: 1500 },
            { type: 'motion', fromIndex: 3, toIndex: 4, durationMs: 1500 },
          ],
        },
      ],
      timelineData: {
        totalDuration: 3000,
        segmentDurations: [3000],
        cumulativeDurations: [3000],
      },
      timelineDataset: makeTimelineDataset((movieTimeMs) => ({
        frameIndex: movieTimeMs < 2250 ? 3 : 4,
        segmentIndex: 0,
        timelineProgress: movieTimeMs / 3000,
      })),
      store,
      onTimelinePositionUpdated: () => {},
    });

    controller.handleTimelineClick(0, 2600);

    expect(store.getState().goToPositionCalls).to.have.length(1);
    expect(store.getState().goToPositionCalls[0]).to.deep.include({
      position: 4,
      direction: 'forward',
    });
    expect(store.getState().goToPositionCalls[0].options.timelineProgress).to.be.closeTo(
      2600 / 3000,
      0.000001
    );
  });

  it('uses jump direction and preserves exact timeline position when clicking the already active tree', () => {
    const store = makeStore({ frameIndex: 3 });
    const controller = new TimelineNavigationController({
      segments: [
        {
          index: 0,
          isInputTreeSegment: false,
          hasInterpolation: true,
          interpolationData: [{ originalIndex: 2 }, { originalIndex: 3 }, { originalIndex: 4 }],
          timing: [
            { type: 'motion', fromIndex: 2, toIndex: 3, durationMs: 1500 },
            { type: 'motion', fromIndex: 3, toIndex: 4, durationMs: 1500 },
          ],
        },
      ],
      timelineData: {
        totalDuration: 3000,
        segmentDurations: [3000],
        cumulativeDurations: [3000],
      },
      timelineDataset: makeTimelineDataset(() => ({
        frameIndex: 3,
        segmentIndex: 0,
        timelineProgress: 0.5,
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
    expect(store.getState().goToPositionCalls[0].options.timelineProgress).to.be.closeTo(
      0.5,
      0.000001
    );
  });

  it('throws when a timed click targets a segment without timing intervals', () => {
    const store = makeStore({ frameIndex: 0 });
    const controller = new TimelineNavigationController({
      segments: [
        {
          index: 0,
          isInputTreeSegment: false,
          hasInterpolation: true,
          interpolationData: [{ originalIndex: 2 }, { originalIndex: 3 }],
        },
      ],
      timelineData: {
        totalDuration: 1000,
        segmentDurations: [1000],
        cumulativeDurations: [1000],
      },
      timelineDataset: makeTimelineDataset(() => {
        throw new Error('[TimelineDataset] segment timing bounds are required');
      }),
      store,
      onTimelinePositionUpdated: () => {},
    });

    expect(() => controller.handleTimelineClick(0, 500)).to.throw(
      /segment timing bounds are required/
    );
    expect(store.getState().goToPositionCalls).to.deep.equal([]);
  });
});
