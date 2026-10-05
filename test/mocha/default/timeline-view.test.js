const { expect } = require('chai');
const sinon = require('sinon');
const { JSDOM } = require('jsdom');
const { clearTimelineModuleCache, installDeckGLMocks } = require('../../helpers/deckGLMocks.js');
// Ignore CSS imports from the view in test environment
require.extensions['.css'] = () => {};

// Minimal DOM for view sizing
const dom = new JSDOM('<!doctype html><html><body></body></html>');
global.window = dom.window;
global.document = dom.window.document;
global.requestAnimationFrame = dom.window.requestAnimationFrame || ((cb) => setTimeout(cb, 0));
global.cancelAnimationFrame = dom.window.cancelAnimationFrame || ((id) => clearTimeout(id));

installDeckGLMocks();
clearTimelineModuleCache();

// Now require the SUT after mocks are in place
const { TimelineView } = require('../../../src/timeline/TimelineView.js');
const { TIMELINE_THEME } = require('../../../src/timeline/stripGeometry.js');

describe('TimelineView', () => {
  function makeContainer(w = 800, h = 100) {
    const container = global.document.createElement('div');
    let width = w;
    let height = h;
    container.getBoundingClientRect = () => ({
      width,
      height,
      top: 0,
      left: 0,
      right: width,
      bottom: height,
    });
    container.setTestSize = (nextWidth, nextHeight = height) => {
      width = nextWidth;
      height = nextHeight;
    };
    global.document.body.appendChild(container);
    return container;
  }

  // Segments laid end to end, `durations[i]` ms each: the spans and steps the view reads
  function timelineOf(segments, durations = segments.map(() => 1000), cursorAt = () => null) {
    let clock = 0;
    const steps = segments.map((segment, index) => {
      const step = { start: clock, end: clock + durations[index], segment: index };
      Object.assign(segment, { start: step.start, end: step.end });
      clock = step.end;
      return step;
    });
    return { segments, steps, totalDuration: clock, cursorAt };
  }

  function makeTimelineFixture() {
    const segments = [
      { isInputTreeSegment: true, originalTreeIndex: 0 },
      {
        isInputTreeSegment: false,
        pairId: 'pair_0_1',
        pairOrdinal: 0,
        sourceInputTreeIndex: 0,
        targetInputTreeIndex: 1,
        sourceGlobalIndex: 0,
        targetGlobalIndex: 10,
        globalStart: 1,
        globalEnd: 9,
        localStepStart: 0,
      },
      { isInputTreeSegment: true, originalTreeIndex: 1 },
    ];
    // 3 segments of 1000ms; the cursor at a time: its segment, and frame 5 for any transition
    const timeline = timelineOf(segments, undefined, (ms) => ({
      segmentIndex: Math.min(2, Math.floor(ms / 1000)),
      frameIndex: 5,
      movieTimeMs: ms,
    }));
    return { timeline, segments };
  }

  // One pair whose bar and SPR pip sit on the single transition segment (1000-2000ms)
  const pairStrip = {
    spans: [
      {
        pairId: 'pair_0_1',
        startMs: 1000,
        endMs: 2000,
        kind: 'topology',
        rf: 0.2,
        pips: [{ ms: 1500, taxaCount: 2 }],
      },
    ],
    maxRf: 0.2,
  };
  const noStrip = { spans: [], maxRf: 0 };

  // The callbacks record what the input reports. Selecting also draws the selection, which the
  // controller does from the store.
  function mountView(timeline, { strip = noStrip, container = makeContainer() } = {}) {
    const events = { scrubs: [], selects: [], hovers: [], inspects: [] };
    const view = new TimelineView(timeline, strip, {
      onScrub: (ms, phase) => events.scrubs.push({ ms, phase }),
      onSelect: (index, ms) => {
        events.selects.push({ index, ms });
        view.setSelection(index);
      },
      onHover: (index) => events.hovers.push(index),
      onInspect: (index) => events.inspects.push(index),
    }).init(container);
    return { view, events };
  }

  function findLayer(view, id) {
    return view.deck.props.layers.find((l) => l.id === id);
  }

  function dispatchMouse(target, type, clientX, clientY = 10) {
    target.dispatchEvent(new global.window.MouseEvent(type, { bubbles: true, clientX, clientY }));
  }

  const clickTimeline = (view, ms) => dispatchMouse(view.canvas, 'click', view.msToX(ms));
  const mouseDownTimeline = (view, x) => dispatchMouse(view.canvas, 'mousedown', x);
  const keyDown = (view, key, init = {}) =>
    view.canvas.dispatchEvent(
      new global.window.KeyboardEvent('keydown', { bubbles: true, key, ...init })
    );

  it('initializes and sets layers with a fresh timeline', () => {
    const { timeline } = makeTimelineFixture();

    const { view } = mountView(timeline);

    expect(view.deck).to.exist;
    expect(Array.isArray(view.deck.props.layers)).to.equal(true);
    expect(view.deck.props.layers.length).to.be.greaterThan(0);
  });

  it('updates scrubber position on setCustomTime', () => {
    const { timeline } = makeTimelineFixture();
    const { view } = mountView(timeline, { container: makeContainer(800, 120) });

    view.setCustomTime(1500);
    view._updateLayers();
    // Find scrubber layer by id
    const scrubber = view.deck.props.layers.find((l) => l.id === 'scrubber-layer');
    expect(scrubber).to.exist;
    const path = scrubber.props.data?.[0]?.path;
    expect(Array.isArray(path)).to.equal(true);
    // With width=800 and ms=1500 in [0,3000], scrub x should be centered
    expect(path[0][0]).to.be.closeTo(0, 1e-6);
    expect(path[1][0]).to.be.closeTo(0, 1e-6);
  });

  it('draws input-window ticks on a baseline for dense tree-only timelines', () => {
    const timeline = timelineOf(Array.from({ length: 100 }, () => ({ isInputTreeSegment: true })));
    const { view } = mountView(timeline, { container: makeContainer(800, 44) });

    expect(findLayer(view, 'baseline-layer').props.data).to.have.length(1);
    expect(findLayer(view, 'input-tree-tick-layer').props.data).to.have.length(100);
    expect(findLayer(view, 'input-tree-layer').props.data).to.have.length(0);
    expect(findLayer(view, 'pair-mark-layer').props.data).to.have.length(0);
    expect(findLayer(view, 'separator-layer').props.data).to.have.length(0);
  });

  it('marks each segment start with a separator while the input trees are drawn as circles', () => {
    const { timeline } = makeTimelineFixture();
    const { view } = mountView(timeline);
    const separators = findLayer(view, 'separator-layer');

    expect(separators.props.data).to.have.length(3);
    expect(separators.props.getColor).to.deep.equal([0, 0, 0, TIMELINE_THEME.separatorAlpha]);
  });

  it('keeps the old amber transition layers off the strip', () => {
    const { timeline } = makeTimelineFixture();
    const { view } = mountView(timeline, { strip: pairStrip });
    const ids = view.deck.props.layers.map((l) => l.id);

    expect(ids).to.not.include.members(['strip-track-layer', 'connection-layer']);
    expect(ids).to.include.members(['baseline-layer', 'pair-mark-layer', 'pair-pip-layer']);
  });

  it('draws one bar and one pip per pair, under the playhead', () => {
    const { timeline } = makeTimelineFixture();
    const { view } = mountView(timeline, { strip: pairStrip, container: makeContainer(800, 44) });
    const ids = view.deck.props.layers.map((l) => l.id);

    expect(findLayer(view, 'pair-mark-layer').props.data).to.have.length(1);
    expect(findLayer(view, 'pair-pip-layer').props.data).to.have.length(1);
    expect(ids[ids.length - 1]).to.equal('scrubber-layer');
    expect(ids.indexOf('pair-pip-layer')).to.be.greaterThan(ids.indexOf('pair-mark-layer'));
  });

  it('turns the hovered transition pair darker and the selected pair emerald', () => {
    const { timeline } = makeTimelineFixture();
    const { view } = mountView(timeline, { strip: pairStrip, container: makeContainer(800, 44) });

    view.setHover(1);
    view.setSelection(1);

    expect(findLayer(view, 'pair-hover-layer').props.data).to.have.length(1);
    expect(findLayer(view, 'pair-selection-layer').props.data).to.have.length(1);
    expect(findLayer(view, 'pair-selection-span-layer').props.data).to.have.length(1);
    expect(findLayer(view, 'pair-selection-pip-layer').props.data).to.have.length(1);
  });

  it('leaves pair marks alone when an input tree is selected', () => {
    const { timeline } = makeTimelineFixture();
    const { view } = mountView(timeline, { strip: pairStrip, container: makeContainer(800, 44) });

    view.setSelection(0);

    expect(findLayer(view, 'pair-selection-layer').props.data).to.have.length(0);
    expect(findLayer(view, 'pair-selection-span-layer').props.data).to.have.length(0);
    expect(findLayer(view, 'input-tree-selection-layer').props.data).to.have.length(1);
  });

  it('uses distinct colors for selected segments and the current playhead', () => {
    expect(TIMELINE_THEME.connectionSelectionRGB).to.not.deep.equal(TIMELINE_THEME.scrubberCoreRGB);
  });

  it('draws a wider scrubber handle while scrubbing', () => {
    const { timeline } = makeTimelineFixture();
    const { view } = mountView(timeline);

    expect(findLayer(view, 'scrubber-layer').props.widthMinPixels).to.equal(7);

    view.setScrubbing(true);
    expect(findLayer(view, 'scrubber-layer').props.widthMinPixels).to.equal(10);

    view.setScrubbing(false);
    expect(findLayer(view, 'scrubber-layer').props.widthMinPixels).to.equal(7);
  });

  it('zooms about a time and fits back', () => {
    const { timeline } = makeTimelineFixture();
    const { view } = mountView(timeline);

    view.zoom(0.8, 1500);
    expect(view._rangeStart).to.be.closeTo(300, 1e-6);
    expect(view._rangeEnd).to.be.closeTo(2700, 1e-6);

    view.fit();
    expect([view._rangeStart, view._rangeEnd]).to.deep.equal([0, 3000]);
  });

  it('exposes the deck canvas as a keyboard-focusable timeline control', () => {
    const { timeline } = makeTimelineFixture();

    const { view } = mountView(timeline);

    expect(view.canvas.getAttribute('tabindex')).to.equal('0');
    expect(view.canvas.getAttribute('role')).to.equal('slider');
    expect(view.canvas.getAttribute('aria-label')).to.equal('Movie timeline position');
    expect(view.canvas.getAttribute('aria-valuemin')).to.equal('0');
    expect(view.canvas.getAttribute('aria-valuemax')).to.equal('3000');
    expect(view.canvas.getAttribute('aria-valuenow')).to.equal('0');
    expect(view.canvas.getAttribute('aria-valuetext')).to.equal('Input tree 1 of 2');
  });

  it('describes a transition by its pair and step for assistive timeline feedback', () => {
    const { timeline } = makeTimelineFixture();
    const { view } = mountView(timeline);

    view.setCustomTime(1500);

    // frame 5 of the 9 frames generated between frames 0 and 10
    expect(view.canvas.getAttribute('aria-valuetext')).to.equal(
      'Transition 1 of 1: tree 1 to tree 2, step 5 of 9'
    );
  });

  it('describes a transition without a step when no frames are generated between its trees', () => {
    const { timeline } = makeTimelineFixture();
    const { view } = mountView({
      ...timeline,
      segments: timeline.segments.map((segment) => ({ ...segment, targetGlobalIndex: 1 })),
    });

    view.setCustomTime(1500);

    expect(view.canvas.getAttribute('aria-valuetext')).to.equal(
      'Transition 1 of 1: tree 1 to tree 2'
    );
  });

  it('rewrites the slider text only when the playhead changes segment or step', () => {
    const { timeline } = makeTimelineFixture();
    const { view } = mountView(timeline);
    const setAttribute = sinon.spy(view.canvas, 'setAttribute');
    const writes = (name) => setAttribute.getCalls().filter((call) => call.args[0] === name).length;

    for (let ms = 1100; ms < 2000; ms += 100) view.setCustomTime(ms);
    // Nine moves inside the transition: one new text, nine new values.
    expect(writes('aria-valuetext')).to.equal(1);
    expect(writes('aria-valuenow')).to.equal(9);
    expect(view.canvas.getAttribute('aria-valuenow')).to.equal('1900');

    view.setCustomTime(2500);
    expect(writes('aria-valuetext')).to.equal(2);
    expect(view.canvas.getAttribute('aria-valuetext')).to.equal('Input tree 2 of 2');
  });

  it('cancels pending frame work and the hover clear on destroy', () => {
    const clock = sinon.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const originalCancelAnimationFrame = global.cancelAnimationFrame;
    try {
      const { timeline } = makeTimelineFixture();
      const { view, events } = mountView(timeline);
      dispatchMouse(view.canvas, 'mousemove', 100);
      dispatchMouse(view.canvas, 'mouseleave', 100);

      let canceledFrameId = null;
      global.cancelAnimationFrame = (id) => {
        canceledFrameId = id;
      };
      view._updateFrameId = 42;
      view.destroy();
      clock.tick(1000);

      expect(canceledFrameId).to.equal(42);
      expect(view._updateFrameId).to.equal(null);
      expect(events.hovers).to.deep.equal([0]);
    } finally {
      global.cancelAnimationFrame = originalCancelAnimationFrame;
      clock.restore();
    }
  });

  it('detaches input handling before finalizing deck on destroy', () => {
    const { timeline } = makeTimelineFixture();
    const { view } = mountView(timeline);

    // Finalizing while mouse handlers are still bound would let a late event
    // reach a torn-down deck, so the order is a contract rather than incidental.
    const order = [];
    const originalRemoveEventListener = global.window.removeEventListener.bind(global.window);
    global.window.removeEventListener = (event, handler, options) => {
      if (event === 'mouseup') order.push('unbind');
      return originalRemoveEventListener(event, handler, options);
    };
    view.deck.finalize = () => order.push('finalize');

    view.destroy();

    global.window.removeEventListener = originalRemoveEventListener;

    expect(order).to.deep.equal(['unbind', 'finalize']);
  });

  describe('input', () => {
    it("hears pointer events that bubble up from deck's own canvas", () => {
      const { timeline } = makeTimelineFixture();
      const { view, events } = mountView(timeline);
      const deckCanvas = view.canvas.querySelector('canvas');

      dispatchMouse(deckCanvas, 'mousemove', 100);
      dispatchMouse(deckCanvas, 'click', view.msToX(1500));

      expect(events.hovers).to.deep.equal([0]);
      expect(events.selects.map(({ index }) => index)).to.deep.equal([1]);
    });

    it('starts scrubbing from a forgiving handle hit target', () => {
      const { timeline } = makeTimelineFixture();
      const { view, events } = mountView(timeline);

      mouseDownTimeline(view, 12);

      expect(events.scrubs).to.deep.equal([{ ms: 0, phase: 'start' }]);
    });

    it('drags the handle and keeps the click that ends the drag from selecting', () => {
      const { timeline } = makeTimelineFixture();
      const { view, events } = mountView(timeline);

      mouseDownTimeline(view, 0);
      dispatchMouse(view.canvas, 'mousemove', 400);
      dispatchMouse(global.window, 'mouseup', 400);
      clickTimeline(view, 1500);

      expect(events.scrubs).to.deep.equal([
        { ms: 0, phase: 'start' },
        { ms: 1500, phase: 'move' },
        { ms: 1500, phase: 'end' },
      ]);
      expect(view.scrubberMs).to.equal(1500);
      expect(events.selects).to.deep.equal([]);
      expect(events.hovers).to.deep.equal([]);
    });

    it('keeps distant timeline clicks available for segment selection', () => {
      const { timeline } = makeTimelineFixture();
      const { view, events } = mountView(timeline);

      mouseDownTimeline(view, 120);
      clickTimeline(view, 1500);

      expect(events.scrubs).to.deep.equal([]);
      expect(events.selects).to.have.length(1);
      expect(events.selects[0].index).to.equal(1);
    });

    it('opens the inspector request for a double-clicked transition, not an input tree', () => {
      const { timeline } = makeTimelineFixture();
      const { view, events } = mountView(timeline);
      const dblclick = (ms) => dispatchMouse(view.canvas, 'dblclick', view.msToX(ms));

      dblclick(500);
      expect(events.inspects).to.have.length(0);

      dblclick(1500);
      expect(events.inspects).to.deep.equal([1]);
      expect(events.selects[events.selects.length - 1].index).to.equal(1);
    });

    it('keeps a single click from requesting the inspector', () => {
      const { timeline } = makeTimelineFixture();
      const { view, events } = mountView(timeline);

      clickTimeline(view, 1500);

      expect(events.inspects).to.have.length(0);
    });

    it('moves timeline selection with keyboard navigation', () => {
      const { timeline } = makeTimelineFixture();
      const { view, events } = mountView(timeline);

      keyDown(view, 'ArrowRight');

      expect(events.selects).to.have.length(1);
      expect(events.selects[0].index).to.equal(1);
      expect(view.selected).to.equal(1);

      keyDown(view, 'End');

      expect(events.selects).to.have.length(2);
      expect(events.selects[1].index).to.equal(2);
      expect(view.selected).to.equal(2);
      expect(view.canvas.getAttribute('aria-valuenow')).to.equal('2500');

      keyDown(view, 'ArrowLeft', { shiftKey: true });
      expect(view.selected).to.equal(1);

      keyDown(view, 'Home');
      expect(view.selected).to.equal(0);
      expect(view.canvas.getAttribute('aria-valuenow')).to.equal('500');

      // Modified and unrelated keys are left alone
      keyDown(view, 'ArrowRight', { ctrlKey: true });
      keyDown(view, 'a');
      expect(events.selects).to.have.length(4);
    });

    it('reports the hovered segment, again while it stays hovered', () => {
      const { timeline } = makeTimelineFixture();
      const container = makeContainer();
      let left = 0;
      let top = 0;
      const originalGetRect = container.getBoundingClientRect;
      container.getBoundingClientRect = () => {
        const rect = originalGetRect();
        return { ...rect, left, top, right: left + rect.width, bottom: top + rect.height };
      };
      const { view, events } = mountView(timeline, { container });

      dispatchMouse(view.canvas, 'mousemove', 100);

      expect(events.hovers).to.deep.equal([0]);
      expect(view.anchorX(0)).to.be.closeTo(400 / 3, 1e-6);

      // The tooltip anchor follows the strip when the page moves under a still pointer
      left = 40;
      top = 12;
      dispatchMouse(view.canvas, 'mousemove', 140, 22);

      expect(events.hovers).to.deep.equal([0, 0]);
      expect(view.anchorX(0)).to.be.closeTo(40 + 400 / 3, 1e-6);
    });

    it('clears the hover 150 ms after the pointer leaves, unless it comes back', () => {
      const clock = sinon.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
      try {
        const { timeline } = makeTimelineFixture();
        const { view, events } = mountView(timeline);

        dispatchMouse(view.canvas, 'mousemove', 100);
        dispatchMouse(view.canvas, 'mouseleave', 100);
        clock.tick(149);
        expect(events.hovers).to.deep.equal([0]);
        clock.tick(1);
        expect(events.hovers).to.deep.equal([0, null]);

        dispatchMouse(view.canvas, 'mousemove', 100);
        dispatchMouse(view.canvas, 'mouseleave', 100);
        clock.tick(100);
        dispatchMouse(view.canvas, 'mousemove', 100);
        clock.tick(1000);
        expect(events.hovers).to.deep.equal([0, null, 0, 0]);
      } finally {
        clock.restore();
      }
    });

    it('selects an input-tree segment from a deck canvas click', () => {
      const { timeline } = makeTimelineFixture();
      const { view, events } = mountView(timeline);

      clickTimeline(view, 500);

      expect(events.selects).to.have.length(1);
      expect(events.selects[0].index).to.equal(0);
      expect(view.selected).to.equal(0);
    });

    it('selects a generated transition segment from a deck canvas click', () => {
      const { timeline } = makeTimelineFixture();
      const { view, events } = mountView(timeline);

      clickTimeline(view, 1500);

      expect(events.selects).to.have.length(1);
      expect(events.selects[0].index).to.equal(1);
      expect(view.selected).to.equal(1);
    });

    it('selects the transition beside an input tree when the click is nearer its centre', () => {
      const segments = [
        { isInputTreeSegment: true },
        { isInputTreeSegment: false },
        { isInputTreeSegment: true },
      ];
      const timeline = timelineOf(segments, [1000, 400, 1000]);
      const { view, events } = mountView(timeline);

      // 10 ms before the end of the input tree: 490 from its centre, 210 from the transition's
      clickTimeline(view, 990);
      clickTimeline(view, 400);

      expect(events.selects.map(({ index }) => index)).to.deep.equal([1, 0]);
    });

    it('selects the last segment for a click on the far edge of the timeline', () => {
      const { timeline } = makeTimelineFixture();
      const { view, events } = mountView(timeline);

      clickTimeline(view, 3000);

      expect(events.selects).to.deep.equal([{ index: 2, ms: 3000 }]);
      expect(view.selected).to.equal(2);
    });

    it('selects the expected segment in dense timelines', () => {
      const timeline = timelineOf(
        Array.from({ length: 100 }, (_, index) => ({ isInputTreeSegment: index % 2 === 0 }))
      );
      const { view, events } = mountView(timeline, { container: makeContainer(800, 120) });

      clickTimeline(view, 51500);

      expect(events.selects).to.have.length(1);
      expect(events.selects[0].index).to.equal(51);
      expect(view.selected).to.equal(51);
    });

    it('keeps click selection accurate after the timeline host resizes', () => {
      const { timeline } = makeTimelineFixture();
      const container = makeContainer(800, 120);
      const { view, events } = mountView(timeline, { container });

      container.setTestSize(480, 120);
      view._updateLayers();
      clickTimeline(view, 2500);

      expect(events.selects).to.have.length(1);
      expect(events.selects[0].index).to.equal(2);
      expect(view.selected).to.equal(2);
    });

    it('selects a clicked hover circle once, as its own segment', () => {
      const { timeline } = makeTimelineFixture();
      const { view, events } = mountView(timeline);
      view.setHover(0);
      const circle = findLayer(view, 'input-tree-hover-layer');
      const [marker] = circle.props.data;

      // A real click reaches the wrapper's own listener and, if the layer were pickable, deck's
      // click too, a second select that the nearest-centre rule of the first can disagree with
      clickTimeline(view, 375);
      circle.props.onClick?.({ object: marker, coordinate: marker.position });

      expect(events.selects.map(({ index }) => index)).to.deep.equal([0]);
    });

    it('zooms about the pointer on wheel', () => {
      const { timeline } = makeTimelineFixture();
      const { view } = mountView(timeline);

      const wheel = new global.window.WheelEvent('wheel', {
        bubbles: true,
        cancelable: true,
        deltaY: -1,
        clientX: view.msToX(1500),
      });
      view.canvas.dispatchEvent(wheel);

      expect(wheel.defaultPrevented).to.equal(true);
      expect(view._rangeStart).to.be.closeTo(300, 1e-6);
      expect(view._rangeEnd).to.be.closeTo(2700, 1e-6);
    });
  });
});
