const { expect } = require('chai');

const scheduledFrames = [];

const { TimelineNavigationController } = require('../src/timeline/core/TimelineNavigationController.js');

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
      currentTreeIndex: 0,
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
      }
    };
  }

  it('navigates to input-tree segments and updates the clipboard', () => {
    const store = makeStore({ currentTreeIndex: 1 });
    let updateCalls = 0;
    const controller = new TimelineNavigationController({
      segments: [
        {
          index: 0,
          isFullTree: true,
          interpolationData: [{ originalIndex: 4 }]
        }
      ],
      store,
      onTimelinePositionUpdated: () => { updateCalls += 1; }
    });

    controller.handleTimelineClick(0);

    expect(store.getState().setClipboardTreeIndexCalls).to.deep.equal([4]);
    expect(store.getState().goToPositionCalls).to.deep.equal([{ position: 4, direction: 'forward', options: undefined }]);
    expect(scheduledFrames).to.have.length(1);

    scheduledFrames[0]();
    expect(updateCalls).to.equal(1);
  });

  it('navigates to transition segments without updating the clipboard', () => {
    const store = makeStore({ currentTreeIndex: 5 });
    const controller = new TimelineNavigationController({
      segments: [
        {
          index: 0,
          isFullTree: false,
          interpolationData: [{ originalIndex: 2 }]
        }
      ],
      store,
      onTimelinePositionUpdated: () => {}
    });

    controller.handleTimelineClick(0);

    expect(store.getState().setClipboardTreeIndexCalls).to.deep.equal([]);
    expect(store.getState().goToPositionCalls).to.deep.equal([{ position: 2, direction: 'backward', options: undefined }]);
  });

  it('uses click time to resolve the nearest transition frame', () => {
    const store = makeStore({ currentTreeIndex: 0 });
    const controller = new TimelineNavigationController({
      segments: [
        {
          index: 0,
          isFullTree: false,
          hasInterpolation: true,
          interpolationData: [
            { originalIndex: 2 },
            { originalIndex: 3 },
            { originalIndex: 4 }
          ]
        }
      ],
      timelineData: {
        totalDuration: 3000,
        segmentDurations: [3000],
        cumulativeDurations: [3000]
      },
      store,
      onTimelinePositionUpdated: () => {}
    });

    controller.handleTimelineClick(0, 2600);

    expect(store.getState().goToPositionCalls).to.have.length(1);
    expect(store.getState().goToPositionCalls[0]).to.deep.include({ position: 4, direction: 'forward' });
    expect(store.getState().goToPositionCalls[0].options.timelineProgress).to.be.closeTo(2600 / 3000, 0.000001);
  });

  it('uses jump direction and preserves exact timeline position when clicking the already active tree', () => {
    const store = makeStore({ currentTreeIndex: 3 });
    const controller = new TimelineNavigationController({
      segments: [
        {
          index: 0,
          isFullTree: false,
          hasInterpolation: true,
          interpolationData: [
            { originalIndex: 2 },
            { originalIndex: 3 },
            { originalIndex: 4 }
          ]
        }
      ],
      timelineData: {
        totalDuration: 3000,
        segmentDurations: [3000],
        cumulativeDurations: [3000]
      },
      store,
      onTimelinePositionUpdated: () => {}
    });

    controller.handleTimelineClick(0, 1500);

    expect(store.getState().goToPositionCalls).to.have.length(1);
    expect(store.getState().goToPositionCalls[0]).to.deep.include({ position: 3, direction: 'jump' });
    expect(store.getState().goToPositionCalls[0].options.timelineProgress).to.be.closeTo(0.5, 0.000001);
  });
});
