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

    state.goToPosition = (position, direction) => {
      state.goToPositionCalls.push({ position, direction });
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

  it('navigates to anchor segments and updates the clipboard', () => {
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
    expect(store.getState().goToPositionCalls).to.deep.equal([{ position: 4, direction: 'forward' }]);
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
    expect(store.getState().goToPositionCalls).to.deep.equal([{ position: 2, direction: 'backward' }]);
  });

  it('uses jump direction when clicking the already active tree', () => {
    const store = makeStore({ currentTreeIndex: 3 });
    const controller = new TimelineNavigationController({
      segments: [
        {
          index: 0,
          isFullTree: true,
          interpolationData: [{ originalIndex: 3 }]
        }
      ],
      store,
      onTimelinePositionUpdated: () => {}
    });

    controller.handleTimelineClick(0);

    expect(store.getState().goToPositionCalls).to.deep.equal([{ position: 3, direction: 'jump' }]);
  });
});
