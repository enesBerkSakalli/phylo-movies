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

// Each theme token the strip reads gets its own value, so a layer's colour names its role
const TOKENS = {
  '--data-mark': [101, 0, 0],
  '--data-mark-strong': [102, 0, 0],
  '--hover-mark': [103, 0, 0],
  '--primary': [104, 0, 0],
  '--signal': [105, 0, 0],
  '--background': [106, 0, 0],
  '--axis': [107, 0, 0],
  '--grid': [108, 0, 0],
};
const setTokens = (tokens) =>
  Object.entries(tokens).forEach(([name, [r, g, b]]) =>
    global.document.documentElement.style.setProperty(name, `rgb(${r} ${g} ${b})`)
  );
const tokenRgba = (name) => [...TOKENS[name], 255];

describe('TimelineView', () => {
  beforeEach(() => setTokens(TOKENS));
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

  // The callbacks record what the input reports. Selecting and deselecting also draw the
  // selection, which the controller does from the store.
  function mountView(timeline, { strip = noStrip, container = makeContainer() } = {}) {
    const events = { scrubs: [], selects: [], deselects: 0, hovers: [], inspects: [] };
    const view = new TimelineView(timeline, strip, {
      onScrub: (ms, phase) => events.scrubs.push({ ms, phase }),
      onSelect: (index, ms) => {
        events.selects.push({ index, ms });
        view.setSelection(index);
      },
      onDeselect: () => {
        events.deselects += 1;
        view.setSelection(null);
      },
      onHover: (index) => events.hovers.push(index),
      onInspect: (index) => events.inspects.push(index),
    }).init(container);
    return { view, events };
  }

  function findLayer(view, id) {
    return view.deck.props.layers.find((l) => l.id === id);
  }

  function dispatchMouse(target, type, clientX, clientY = 10, init = {}) {
    target.dispatchEvent(
      new global.window.MouseEvent(type, { bubbles: true, clientX, clientY, ...init })
    );
  }

  // A pointer is a mouse unless told otherwise; touch has no hover.
  function dispatchPointer(target, type, clientX, clientY = 10, init = {}) {
    target.dispatchEvent(
      new global.window.PointerEvent(type, {
        bubbles: true,
        clientX,
        clientY,
        pointerId: 1,
        pointerType: 'mouse',
        ...init,
      })
    );
  }

  const clickTimeline = (view, ms) => dispatchMouse(view.canvas, 'click', view.msToX(ms));
  const pointerDownTimeline = (view, x, init) =>
    dispatchPointer(view.canvas, 'pointerdown', x, 10, init);
  // A keydown that can be cancelled, returned so the test can ask whether it was handled
  const press = (view, key, init = {}) => {
    const event = new global.window.KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      key,
      ...init,
    });
    view.canvas.dispatchEvent(event);
    return event;
  };

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

  it('keeps the whole playhead line in view at the ends of the strip', () => {
    const { timeline } = makeTimelineFixture();
    const { view } = mountView(timeline, { container: makeContainer(800, 120) });
    const lineX = () => findLayer(view, 'scrubber-layer').props.data[0].path[0][0];

    view.setCustomTime(0);
    view._updateLayers();
    expect(lineX()).to.be.at.least(-400 + 1.5);

    view.setCustomTime(3000);
    view._updateLayers();
    expect(lineX()).to.be.at.most(400 - 1.5);
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

  it('draws the 1 px baseline on the pixel row under the bars, not half on each of two', () => {
    const { timeline } = makeTimelineFixture();
    const { view } = mountView(timeline, { container: makeContainer(800, 44) });
    const [baseline] = findLayer(view, 'baseline-layer').props.data;

    // The bars stand on y = 44 / 2 - stripBaselineY (y points up); the line fills the row below
    expect(baseline.path.map(([, y]) => y)).to.deep.equal([-8.5, -8.5]);
  });

  it('marks each segment start with a separator while the input trees are drawn as circles', () => {
    const { timeline } = makeTimelineFixture();
    const { view } = mountView(timeline);
    const separators = findLayer(view, 'separator-layer');

    expect(separators.props.data).to.have.length(3);
    expect(separators.props.getColor).to.deep.equal(tokenRgba('--grid'));
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
    expect(ids.indexOf('pair-mark-layer')).to.be.lessThan(ids.indexOf('scrubber-layer'));
    expect(ids.indexOf('pair-pip-layer')).to.be.greaterThan(ids.indexOf('pair-mark-layer'));
  });

  it('draws the selection over the playhead line, and the grab knob over everything', () => {
    const { timeline } = makeTimelineFixture();
    const { view } = mountView(timeline, { strip: pairStrip, container: makeContainer(800, 44) });
    view.setSelection(1);
    const ids = view.deck.props.layers.map((l) => l.id);
    const line = ids.indexOf('scrubber-layer');

    expect(line).to.be.greaterThan(-1);
    [
      'pair-selection-layer',
      'pair-selection-span-layer',
      'input-tree-selection-layer',
      'pair-selection-pip-layer',
    ].forEach((id) => expect(ids.indexOf(id), id).to.be.greaterThan(line));
    expect(ids[ids.length - 1]).to.equal('scrubber-knob-layer');
  });

  it('draws the knob in the headroom above the tallest bar, in the signal colour', () => {
    const { timeline } = makeTimelineFixture();
    const { view } = mountView(timeline, { container: makeContainer(800, 44) });
    view.setCustomTime(1500);
    view._updateLayers();
    const knob = findLayer(view, 'scrubber-knob-layer');
    const xs = knob.props.data[0].polygon.map(([x]) => x);
    const ys = knob.props.data[0].polygon.map(([, y]) => y);

    expect(Math.min(...xs)).to.be.closeTo(-TIMELINE_THEME.scrubberKnobWidth / 2, 1e-6);
    expect(Math.max(...xs)).to.be.closeTo(TIMELINE_THEME.scrubberKnobWidth / 2, 1e-6);
    expect(Math.max(...ys)).to.equal(22); // the top of the 44 px strip
    expect(22 - Math.min(...ys)).to.equal(TIMELINE_THEME.scrubberKnobDepth);
    expect(TIMELINE_THEME.scrubberKnobDepth).to.be.at.most(
      TIMELINE_THEME.stripBaselineY - TIMELINE_THEME.stripBarMaxHeight
    );
    expect(knob.props.getFillColor).to.deep.equal(tokenRgba('--signal'));
  });

  it('turns the hovered transition pair darker and the selected pair ink', () => {
    const { timeline } = makeTimelineFixture();
    const { view } = mountView(timeline, { strip: pairStrip, container: makeContainer(800, 44) });

    view.setHover(1);
    view.setSelection(1);

    expect(findLayer(view, 'pair-hover-layer').props.data).to.have.length(1);
    expect(findLayer(view, 'pair-selection-layer').props.data).to.have.length(1);
    expect(findLayer(view, 'pair-selection-pip-layer').props.data).to.have.length(1);
    expect(findLayer(view, 'pair-hover-layer').props.getFillColor).to.deep.equal(
      tokenRgba('--hover-mark')
    );
    expect(findLayer(view, 'pair-selection-layer').props.getFillColor).to.deep.equal(
      tokenRgba('--primary')
    );
  });

  it('brackets the selected transition: selection is a shape, not only the ink', () => {
    const { timeline } = makeTimelineFixture();
    const { view } = mountView(timeline, { strip: pairStrip, container: makeContainer(800, 44) });

    view.setSelection(1);
    const bracket = findLayer(view, 'pair-selection-span-layer');

    expect(bracket.props.data).to.have.length(3);
    expect(bracket.props.getFillColor).to.deep.equal(tokenRgba('--primary'));
  });

  it('leaves pair marks alone when an input tree is selected', () => {
    const { timeline } = makeTimelineFixture();
    const { view } = mountView(timeline, { strip: pairStrip, container: makeContainer(800, 44) });

    view.setSelection(0);

    expect(findLayer(view, 'pair-selection-layer').props.data).to.have.length(0);
    expect(findLayer(view, 'pair-selection-span-layer').props.data).to.have.length(0);
    expect(findLayer(view, 'input-tree-selection-layer').props.data).to.have.length(1);
  });

  it('takes every colour from its theme token: marks, selection (ink), playhead (signal)', () => {
    const { timeline } = makeTimelineFixture();
    const { view } = mountView(timeline, { strip: pairStrip, container: makeContainer(800, 44) });
    view.setSelection(1);
    const color = (id, prop) => findLayer(view, id).props[prop];

    expect(color('pair-mark-layer', 'getFillColor')).to.deep.equal(tokenRgba('--data-mark'));
    expect(color('pair-pip-layer', 'getFillColor')).to.deep.equal(tokenRgba('--data-mark-strong'));
    expect(color('pair-selection-pip-layer', 'getFillColor')).to.deep.equal(tokenRgba('--primary'));
    expect(color('scrubber-layer', 'getColor')).to.deep.equal(tokenRgba('--signal'));
    expect(color('baseline-layer', 'getColor')).to.deep.equal(tokenRgba('--axis'));
    expect(color('input-tree-layer', 'getLineColor')).to.deep.equal(
      tokenRgba('--data-mark-strong')
    );
    expect(color('input-tree-layer', 'getFillColor')).to.deep.equal(tokenRgba('--background'));
  });

  it('rings a selected input tree in the ink and a hovered one in the hover colour', () => {
    const { timeline } = makeTimelineFixture();
    const { view } = mountView(timeline);
    view.setSelection(0);
    view.setHover(2);

    const selected = findLayer(view, 'input-tree-selection-layer').props;
    const hovered = findLayer(view, 'input-tree-hover-layer').props;
    expect(selected.getLineColor).to.deep.equal(tokenRgba('--primary'));
    expect(hovered.getLineColor.slice(0, 3)).to.deep.equal(TOKENS['--hover-mark']);
    expect(selected.getFillColor).to.deep.equal(tokenRgba('--background'));
  });

  it('draws a selected dense input-tree tick in the selection ink, not the playhead colour', () => {
    const timeline = timelineOf(Array.from({ length: 100 }, () => ({ isInputTreeSegment: true })));
    const { view } = mountView(timeline, { container: makeContainer(800, 44) });
    view.setSelection(5);
    const active = findLayer(view, 'active-input-tree-tick-layer');

    expect(active.props.data).to.have.length(1);
    expect(active.props.getColor).to.deep.equal(tokenRgba('--primary'));
    expect(findLayer(view, 'input-tree-tick-layer').props.getColor).to.deep.equal(
      tokenRgba('--data-mark')
    );
  });

  it('edges the playhead line with the background, 1 px a side, so it parts from the bars', () => {
    const { timeline } = makeTimelineFixture();
    const { view } = mountView(timeline);
    const ids = view.deck.props.layers.map((l) => l.id);
    const line = findLayer(view, 'scrubber-layer').props;
    const outline = findLayer(view, 'scrubber-outline-layer').props;

    expect(ids.indexOf('scrubber-outline-layer')).to.equal(ids.indexOf('scrubber-layer') - 1);
    expect(outline.data).to.deep.equal(line.data);
    expect(outline.getColor).to.deep.equal(tokenRgba('--background'));
    expect(outline.widthMinPixels).to.equal(line.widthMinPixels + 2);
    view.setScrubbing(true);
    expect(findLayer(view, 'scrubber-outline-layer').props.widthMinPixels).to.equal(5);
  });

  it('re-reads the theme tokens on refreshColors, for a theme switch', () => {
    const { timeline } = makeTimelineFixture();
    const { view } = mountView(timeline);

    setTokens({ '--signal': [1, 2, 3] });
    view.refreshColors();

    expect(findLayer(view, 'scrubber-layer').props.getColor).to.deep.equal([1, 2, 3, 255]);
  });

  it('draws the playhead as a thin line, a little wider while scrubbing', () => {
    const { timeline } = makeTimelineFixture();
    const { view } = mountView(timeline);

    expect(findLayer(view, 'scrubber-layer').props.widthMinPixels).to.equal(2);

    view.setScrubbing(true);
    expect(findLayer(view, 'scrubber-layer').props.widthMinPixels).to.equal(3);

    view.setScrubbing(false);
    expect(findLayer(view, 'scrubber-layer').props.widthMinPixels).to.equal(2);
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

  it('zooms about the playhead when no time is given, or the middle when it is off screen', () => {
    const { timeline } = makeTimelineFixture();
    const { view } = mountView(timeline);

    view.setCustomTime(500);
    view.zoom(0.5);
    expect(view._rangeStart).to.be.closeTo(250, 1e-6);
    expect(view._rangeEnd).to.be.closeTo(1750, 1e-6);

    view.setCustomTime(1000);
    view.zoom(0.5);
    // 1000 sat a third in, and stays there
    expect(view._rangeStart).to.be.closeTo(625, 1e-6);
    expect(view._rangeEnd).to.be.closeTo(1375, 1e-6);

    view.pan(1000); // the playhead is now off screen
    view.zoom(0.5);
    expect(view._rangeStart).to.be.closeTo(1812.5, 1e-6);
    expect(view._rangeEnd).to.be.closeTo(2187.5, 1e-6);
  });

  describe('following the playhead', () => {
    // The view shows about 500..1500 ms
    const zoomedView = () => {
      const { timeline } = makeTimelineFixture();
      const { view } = mountView(timeline);
      view.zoom(1 / 3, 750);
      return { view, shown: [view._rangeStart, view._rangeEnd] };
    };

    it('pages the view once when the playhead leaves it', () => {
      const { view, shown } = zoomedView();
      view.setCustomTime(1490);
      expect([view._rangeStart, view._rangeEnd]).to.deep.equal(shown);

      view.setCustomTime(1510);
      const page = [view._rangeStart, view._rangeEnd];
      expect(page[0]).to.be.closeTo(1410, 1e-6);

      view.setCustomTime(1600);
      view.setCustomTime(1700);
      expect([view._rangeStart, view._rangeEnd]).to.deep.equal(page);
    });

    it('leaves the view where the user put it while the playhead is out of it', () => {
      const { view, shown } = zoomedView();
      view.setCustomTime(2000);
      view.setCustomTime(2100);

      expect([view._rangeStart, view._rangeEnd]).to.deep.equal(shown);
    });

    it('does not page while the handle is being dragged', () => {
      const { view, shown } = zoomedView();
      view.setScrubbing(true);
      view.setCustomTime(1490);
      view.setCustomTime(2500);

      expect([view._rangeStart, view._rangeEnd]).to.deep.equal(shown);
    });
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

  it('maps the pointer with the exact strip width on a fractional container', () => {
    const { timeline } = makeTimelineFixture();
    const width = 333.4;
    const { view, events } = mountView(timeline, { container: makeContainer(width, 100) });

    // 90% of the way across the strip is 90% of the 3000 ms
    expect(view.xToMs(0.9 * width)).to.be.closeTo(2700, 1e-6);
    expect(view.msToX(2700)).to.be.closeTo(0.9 * width, 1e-6);
    dispatchMouse(view.canvas, 'click', 0.9 * width);
    expect(events.selects[0].ms).to.be.closeTo(2700, 1e-6);
    // Deck takes whole pixels
    expect(view.deck.props.width).to.equal(333);
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
      dispatchPointer(view.canvas, 'pointermove', 100);
      dispatchPointer(view.canvas, 'pointerleave', 100);

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

    // Finalizing while pointer handlers are still bound would let a late event
    // reach a torn-down deck, so the order is a contract rather than incidental.
    const order = [];
    const originalRemoveEventListener = view.canvas.removeEventListener.bind(view.canvas);
    view.canvas.removeEventListener = (event, handler, options) => {
      if (event === 'pointerup') order.push('unbind');
      return originalRemoveEventListener(event, handler, options);
    };
    view.deck.finalize = () => order.push('finalize');

    view.destroy();

    expect(order).to.deep.equal(['unbind', 'finalize']);
  });

  describe('input', () => {
    it("hears pointer events that bubble up from deck's own canvas", () => {
      const { timeline } = makeTimelineFixture();
      const { view, events } = mountView(timeline);
      const deckCanvas = view.canvas.querySelector('canvas');

      dispatchPointer(deckCanvas, 'pointermove', 100);
      dispatchMouse(deckCanvas, 'click', view.msToX(1500));

      expect(events.hovers).to.deep.equal([0]);
      expect(events.selects.map(({ index }) => index)).to.deep.equal([1]);
    });

    it('grabs the playhead by its knob or a few px of its line', () => {
      const { timeline } = makeTimelineFixture();
      const { view, events } = mountView(timeline);
      const press = (x, y) => {
        dispatchPointer(view.canvas, 'pointerdown', x, y);
        dispatchPointer(view.canvas, 'pointerup', x, y);
      };

      press(3, 40); // the line, far from the knob
      press(6, 3); // the knob, off the line

      expect(events.scrubs.map(({ phase }) => phase)).to.deep.equal([
        'start',
        'end',
        'start',
        'end',
      ]);
    });

    it('selects, not scrubs, from a press 10 px off the playhead at fit zoom', () => {
      const { timeline } = makeTimelineFixture();
      const { view, events } = mountView(timeline);
      view.setCustomTime(1500);
      const x = view.msToX(1500) + 10;

      dispatchPointer(view.canvas, 'pointerdown', x);
      dispatchPointer(view.canvas, 'pointerup', x);
      dispatchMouse(view.canvas, 'click', x);

      expect(events.scrubs).to.deep.equal([]);
      expect(events.selects.map(({ index }) => index)).to.deep.equal([1]);
    });

    it('does not grab the playhead 10 px from its knob with a mouse, or 10 px down its line with a finger', () => {
      const { timeline } = makeTimelineFixture();
      const { view, events } = mountView(timeline);

      pointerDownTimeline(view, 10, { pointerType: 'mouse' });
      dispatchPointer(view.canvas, 'pointerdown', 10, 40, { pointerType: 'touch', pointerId: 2 });

      expect(events.scrubs).to.deep.equal([]);
    });

    it('lets a finger miss the knob by 10 px', () => {
      const { timeline } = makeTimelineFixture();
      const { view, events } = mountView(timeline);

      dispatchPointer(view.canvas, 'pointerdown', 10, 3, { pointerType: 'touch', pointerId: 2 });

      expect(events.scrubs).to.deep.equal([{ ms: 0, phase: 'start' }]);
    });

    it('drags the handle and keeps the click that ends the drag from selecting', () => {
      const { timeline } = makeTimelineFixture();
      const { view, events } = mountView(timeline);

      pointerDownTimeline(view, 0);
      dispatchPointer(view.canvas, 'pointermove', 400);
      dispatchPointer(view.canvas, 'pointerup', 400);
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

      pointerDownTimeline(view, 120);
      clickTimeline(view, 1500);

      expect(events.scrubs).to.deep.equal([]);
      expect(events.selects).to.have.length(1);
      expect(events.selects[0].index).to.equal(1);
    });

    it('scrubs from a touch drag, holding the pointer so the finger may leave the strip', () => {
      const { timeline } = makeTimelineFixture();
      const { view, events } = mountView(timeline);
      const captured = [];
      view.canvas.setPointerCapture = (id) => captured.push(id);
      const touch = { pointerType: 'touch', pointerId: 7 };

      pointerDownTimeline(view, 0, touch);
      dispatchPointer(view.canvas, 'pointermove', 400, 10, touch);
      dispatchPointer(view.canvas, 'pointerup', 400, 10, touch);

      expect(captured).to.deep.equal([7]);
      expect(events.scrubs).to.deep.equal([
        { ms: 0, phase: 'start' },
        { ms: 1500, phase: 'move' },
        { ms: 1500, phase: 'end' },
      ]);
    });

    it('scrubs even when the browser has already lost the pointer', () => {
      const { timeline } = makeTimelineFixture();
      const { view, events } = mountView(timeline);
      view.canvas.setPointerCapture = () => {
        throw new DOMException('No active pointer with the given id is found', 'NotFoundError');
      };

      pointerDownTimeline(view, 0);
      dispatchPointer(view.canvas, 'pointermove', 400);
      dispatchPointer(view.canvas, 'pointerup', 400);

      expect(events.scrubs.map(({ phase }) => phase)).to.deep.equal(['start', 'move', 'end']);
    });

    it('ends the scrub when the browser cancels the touch', () => {
      const { timeline } = makeTimelineFixture();
      const { view, events } = mountView(timeline);
      const touch = { pointerType: 'touch', pointerId: 7 };

      pointerDownTimeline(view, 0, touch);
      dispatchPointer(view.canvas, 'pointercancel', 0, 10, touch);

      expect(events.scrubs.map(({ phase }) => phase)).to.deep.equal(['start', 'end']);
    });

    for (const interruption of ['lostpointercapture', 'blur']) {
      it(`ends a scrub once on ${interruption} and accepts the next pointer`, () => {
        const { timeline } = makeTimelineFixture();
        const { view, events } = mountView(timeline);
        const touch = { pointerType: 'touch', pointerId: 7 };

        pointerDownTimeline(view, 0, touch);
        dispatchPointer(view.canvas, 'pointermove', 400, 10, touch);
        if (interruption === 'blur') {
          view.canvas.ownerDocument.defaultView.dispatchEvent(new dom.window.Event('blur'));
        } else {
          dispatchPointer(view.canvas, interruption, 400, 10, touch);
        }
        expect(events.scrubs.map(({ phase }) => phase)).to.deep.equal(['start', 'move', 'end']);
        dispatchPointer(view.canvas, 'pointerup', 400, 10, touch);

        pointerDownTimeline(view, 400, { ...touch, pointerId: 8 });
        dispatchPointer(view.canvas, 'pointermove', 600, 10, { ...touch, pointerId: 8 });
        dispatchPointer(view.canvas, 'pointerup', 600, 10, { ...touch, pointerId: 8 });

        expect(events.scrubs).to.deep.equal([
          { ms: 0, phase: 'start' },
          { ms: 1500, phase: 'move' },
          { ms: 1500, phase: 'end' },
          { ms: 1500, phase: 'start' },
          { ms: 2250, phase: 'move' },
          { ms: 2250, phase: 'end' },
        ]);
        view.destroy();
      });
    }

    it('follows only the pointer that grabbed the handle', () => {
      const { timeline } = makeTimelineFixture();
      const { view, events } = mountView(timeline);

      pointerDownTimeline(view, 0, { pointerType: 'touch', pointerId: 7 });
      pointerDownTimeline(view, 0, { pointerType: 'touch', pointerId: 8 });
      dispatchPointer(view.canvas, 'pointermove', 400, 10, { pointerType: 'touch', pointerId: 8 });
      dispatchPointer(view.canvas, 'pointerup', 400, 10, { pointerType: 'touch', pointerId: 8 });

      expect(events.scrubs).to.deep.equal([{ ms: 0, phase: 'start' }]);
    });

    it('hovers for the mouse only: a touch drag over the strip hovers nothing', () => {
      const { timeline } = makeTimelineFixture();
      const { view, events } = mountView(timeline);

      dispatchPointer(view.canvas, 'pointermove', 100, 10, { pointerType: 'touch' });

      expect(events.hovers).to.deep.equal([]);
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

    describe('clicking the selected transition again', () => {
      const clickAt = (view, ms, detail) =>
        dispatchMouse(view.canvas, 'click', view.msToX(ms), 10, { detail });

      it('clears the selection, where a click on another segment selects it', () => {
        const { timeline } = makeTimelineFixture();
        const { view, events } = mountView(timeline);

        clickAt(view, 1500, 1);
        expect(view.selected).to.equal(1);
        clickAt(view, 1600, 1);
        expect(view.selected).to.equal(null);
        expect(events.deselects).to.equal(1);
        expect(events.selects.map(({ index }) => index)).to.deep.equal([1]);

        clickAt(view, 1500, 1);
        clickAt(view, 500, 1);
        expect(view.selected).to.equal(0);
        expect(events.deselects).to.equal(1);
      });

      // A click selects by moving the playhead into the segment, so at fit zoom the next click on it
      // lands within the playhead's few px: a press there that does not move is a click, not a scrub.
      it('clears it when the click lands on the playhead, which the first click moved there', () => {
        const { timeline } = makeTimelineFixture();
        const { view, events } = mountView(timeline);
        view.setCustomTime(1500);
        view.setSelection(1);
        const x = view.msToX(1500);

        dispatchPointer(view.canvas, 'pointerdown', x, 40);
        dispatchPointer(view.canvas, 'pointerup', x, 40);
        dispatchMouse(view.canvas, 'click', x, 40, { detail: 1 });

        expect(events.deselects).to.equal(1);
        expect(view.selected).to.equal(null);
        expect(events.scrubs.map(({ phase }) => phase)).to.deep.equal(['start', 'end']);
      });

      // click, click, dblclick: the first click of a double-click on the selected transition
      // clears it, the second selects it again, and the double-click inspects it
      it('still inspects a double-click on the selected transition, and leaves it selected', () => {
        const { timeline } = makeTimelineFixture();
        const { view, events } = mountView(timeline);
        view.setSelection(1);

        clickAt(view, 1500, 1);
        clickAt(view, 1500, 2);
        dispatchMouse(view.canvas, 'dblclick', view.msToX(1500), 10, { detail: 2 });

        expect(view.selected).to.equal(1);
        expect(events.inspects).to.deep.equal([1]);
      });

      it('does not clear a transition the first click of a double-click just selected', () => {
        const { timeline } = makeTimelineFixture();
        const { view, events } = mountView(timeline);

        clickAt(view, 1500, 1);
        clickAt(view, 1500, 2);
        dispatchMouse(view.canvas, 'dblclick', view.msToX(1500), 10, { detail: 2 });

        expect(events.deselects).to.equal(0);
        expect(view.selected).to.equal(1);
        expect(events.inspects).to.deep.equal([1]);
      });
    });

    it('keeps a single click from requesting the inspector', () => {
      const { timeline } = makeTimelineFixture();
      const { view, events } = mountView(timeline);

      clickTimeline(view, 1500);

      expect(events.inspects).to.have.length(0);
    });

    describe('keyboard and focus', () => {
      // input tree, transition, input tree, transition, input tree: 1000 ms each, so the segment
      // under a time is its thousands
      function fiveSegments() {
        const transition = (n) => ({
          isInputTreeSegment: false,
          pairId: `pair_${n}_${n + 1}`,
          pairOrdinal: n,
          sourceInputTreeIndex: n,
          targetInputTreeIndex: n + 1,
          sourceGlobalIndex: n * 10,
          targetGlobalIndex: n * 10 + 10,
          globalStart: n * 10 + 1,
          globalEnd: n * 10 + 9,
          localStepStart: 0,
        });
        const inputTree = (n) => ({ isInputTreeSegment: true, originalTreeIndex: n });
        return timelineOf(
          [inputTree(0), transition(0), inputTree(1), transition(1), inputTree(2)],
          undefined,
          (ms) => ({
            segmentIndex: Math.min(4, Math.floor(ms / 1000)),
            frameIndex: 5,
            movieTimeMs: ms,
          })
        );
      }

      it('focuses the slider on a press, and keeps deck canvas out of focus', () => {
        const { view } = mountView(fiveSegments());
        const deckCanvas = view.canvas.querySelector('canvas');
        const focus = sinon.spy(view.canvas, 'focus');

        expect(deckCanvas.hasAttribute('tabindex')).to.equal(false);
        dispatchPointer(deckCanvas, 'pointerdown', 100);

        expect(global.document.activeElement).to.equal(view.canvas);
        expect(focus.calledWith({ preventScroll: true })).to.equal(true);
      });

      it('steps to the previous and next transition with PageUp and PageDown, from the playhead, not the selection', () => {
        const { view, events } = mountView(fiveSegments());
        view.setSelection(0);
        view.setCustomTime(3500); // the playhead has moved on; the selection stays where it was clicked

        expect(press(view, 'PageUp').defaultPrevented).to.equal(true);
        expect(events.selects.map(({ index }) => index)).to.deep.equal([1]);
        expect(view.scrubberMs).to.equal(1500);

        press(view, 'PageDown');
        expect(events.selects.map(({ index }) => index)).to.deep.equal([1, 3]);

        press(view, 'PageDown'); // stops at the last transition
        press(view, 'PageUp');
        press(view, 'PageUp'); // and at the first
        expect(events.selects.map(({ index }) => index)).to.deep.equal([1, 3, 1]);
      });

      it('skips input trees with PageUp and PageDown: from one, the next and previous transition', () => {
        const { view, events } = mountView(fiveSegments());
        view.setCustomTime(2500); // input tree 2, between the two transitions

        press(view, 'PageDown');
        expect(events.selects.map(({ index }) => index)).to.deep.equal([3]);
        expect(view.scrubberMs).to.equal(3500);

        view.setCustomTime(2500);
        press(view, 'PageUp');
        expect(events.selects.map(({ index }) => index)).to.deep.equal([3, 1]);
        expect(view.scrubberMs).to.equal(1500);

        view.setCustomTime(4500); // the last input tree: nothing after it
        press(view, 'PageDown');
        view.setCustomTime(500); // the first: nothing before it
        press(view, 'PageUp');
        expect(events.selects).to.have.length(2);
      });

      it('jumps to the first and last segment with Home and End', () => {
        const { view, events } = mountView(fiveSegments());

        press(view, 'End');
        expect(events.selects.at(-1).index).to.equal(4);
        expect(view.canvas.getAttribute('aria-valuenow')).to.equal('4500');

        press(view, 'Home');
        expect(events.selects.at(-1).index).to.equal(0);
        expect(view.canvas.getAttribute('aria-valuenow')).to.equal('500');
      });

      // Space, the arrows and Shift+arrows are the app's (playbackShortcuts), which step from
      // the playhead; the strip must neither act on them nor cancel them
      it('leaves Space, the arrows and Shift+arrows to the app-wide shortcuts', () => {
        const { view, events } = mountView(fiveSegments());
        view.setSelection(1);
        view.setCustomTime(3500);

        for (const [key, init] of [
          [' '],
          ['ArrowRight'],
          ['ArrowLeft'],
          ['ArrowRight', { shiftKey: true }],
          ['ArrowLeft', { shiftKey: true }],
        ]) {
          expect(press(view, key, init).defaultPrevented, key).to.equal(false);
        }
        expect(events.selects).to.have.length(0);
        expect(view.scrubberMs).to.equal(3500);
      });

      it('inspects the selected transition on Enter, and does not move the playhead', () => {
        const { view, events } = mountView(fiveSegments());
        view.setSelection(3);
        view.setCustomTime(500);

        expect(press(view, 'Enter').defaultPrevented).to.equal(true);

        expect(events.inspects).to.deep.equal([3]);
        expect(events.selects).to.have.length(0);
        expect(view.scrubberMs).to.equal(500);
      });

      it('selects the transition under the playhead on Enter when nothing is selected, then inspects it', () => {
        const { view, events } = mountView(fiveSegments());
        view.setCustomTime(1500);

        press(view, 'Enter');

        expect(events.selects).to.deep.equal([{ index: 1, ms: 1500 }]);
        expect(events.inspects).to.deep.equal([1]);
      });

      it('does nothing on Enter on an input tree, selected or not: there is nothing to inspect', () => {
        const { view, events } = mountView(fiveSegments());
        view.setCustomTime(2500);

        press(view, 'Enter');
        view.setSelection(2);
        press(view, 'Enter');

        expect(events.selects).to.have.length(0);
        expect(events.inspects).to.have.length(0);
      });

      it('clears the selection with Escape', () => {
        const { view, events } = mountView(fiveSegments());
        view.setSelection(3);
        view.setCustomTime(500);

        expect(press(view, 'Escape').defaultPrevented).to.equal(true);

        expect(events.deselects).to.equal(1);
        expect(view.selected).to.equal(null);
        expect(view.scrubberMs).to.equal(500);
        expect(events.selects).to.have.length(0);
      });

      it('leaves Escape alone when nothing is selected, for the popovers and the dock', () => {
        const { view, events } = mountView(fiveSegments());

        expect(press(view, 'Escape').defaultPrevented).to.equal(false);
        expect(events.deselects).to.equal(0);
      });

      it('zooms about the playhead with + and -, and fits with 0', () => {
        const { view } = mountView(fiveSegments());
        view.setCustomTime(2500);
        const span = () => view._rangeEnd - view._rangeStart;

        expect(press(view, '+').defaultPrevented).to.equal(true);
        expect(span()).to.be.closeTo(4000, 1e-6);
        press(view, '=');
        expect(span()).to.be.closeTo(3200, 1e-6);
        press(view, '-');
        expect(span()).to.be.closeTo(3840, 1e-6);
        expect(view.msToX(2500)).to.be.closeTo(view._width / 2, 1e-6); // the playhead stays put

        expect(press(view, '0').defaultPrevented).to.equal(true);
        expect([view._rangeStart, view._rangeEnd]).to.deep.equal([0, 5000]);
      });

      it('leaves modified and unrelated keys alone', () => {
        const { view, events } = mountView(fiveSegments());

        view.setSelection(1);
        for (const key of ['PageDown', 'Home', 'End', 'Enter', 'Escape', '+', '-', '0']) {
          for (const modifier of ['ctrlKey', 'metaKey', 'altKey']) {
            expect(press(view, key, { [modifier]: true }).defaultPrevented, key).to.equal(false);
          }
        }
        expect(press(view, 'a').defaultPrevented).to.equal(false);
        expect(events.selects).to.have.length(0);
        expect(events.inspects).to.have.length(0);
        expect(events.deselects).to.equal(0);
        expect(view.zoomed).to.equal(false);
      });

      it('lists its keys for assistive tech', () => {
        const { view } = mountView(fiveSegments());

        expect(view.canvas.getAttribute('aria-keyshortcuts').split(' ')).to.include.members([
          'Space',
          'ArrowLeft',
          'ArrowRight',
          'Shift+ArrowLeft',
          'Shift+ArrowRight',
          'PageUp',
          'PageDown',
          'Home',
          'End',
          'Enter',
          'Escape',
          'Plus',
          'Minus',
          '0',
        ]);
      });
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

      dispatchPointer(view.canvas, 'pointermove', 100);

      expect(events.hovers).to.deep.equal([0]);
      expect(view.anchorX(0)).to.be.closeTo(400 / 3, 1e-6);

      // The tooltip anchor follows the strip when the page moves under a still pointer
      left = 40;
      top = 12;
      dispatchPointer(view.canvas, 'pointermove', 140, 22);

      expect(events.hovers).to.deep.equal([0, 0]);
      expect(view.anchorX(0)).to.be.closeTo(40 + 400 / 3, 1e-6);
    });

    it('clears the hover 150 ms after the pointer leaves, unless it comes back', () => {
      const clock = sinon.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
      try {
        const { timeline } = makeTimelineFixture();
        const { view, events } = mountView(timeline);

        dispatchPointer(view.canvas, 'pointermove', 100);
        dispatchPointer(view.canvas, 'pointerleave', 100);
        clock.tick(149);
        expect(events.hovers).to.deep.equal([0]);
        clock.tick(1);
        expect(events.hovers).to.deep.equal([0, null]);

        dispatchPointer(view.canvas, 'pointermove', 100);
        dispatchPointer(view.canvas, 'pointerleave', 100);
        clock.tick(100);
        dispatchPointer(view.canvas, 'pointermove', 100);
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

    const wheel = (view, init) => {
      const event = new global.window.WheelEvent('wheel', {
        bubbles: true,
        cancelable: true,
        ...init,
      });
      view.canvas.dispatchEvent(event);
      return event;
    };

    it('zooms about the pointer on wheel, which stays under it', () => {
      const { timeline } = makeTimelineFixture();
      const { view } = mountView(timeline);

      const event = wheel(view, { deltaY: -1, clientX: view.msToX(1000) });

      expect(event.defaultPrevented).to.equal(true);
      expect(view._rangeStart).to.be.closeTo(200, 1e-6);
      expect(view._rangeEnd).to.be.closeTo(2600, 1e-6);
      expect(view.msToX(1000)).to.be.closeTo((1000 - 200) * (800 / 2400), 1e-6);
    });

    describe('when zoomed in', () => {
      // 3000 ms in 800 px; the view shows 1000..2000 ms
      const zoomedView = () => {
        const { timeline } = makeTimelineFixture();
        const mounted = mountView(timeline);
        mounted.view.zoom(1 / 3, 1500);
        return mounted;
      };

      it('pans with shift+wheel and with horizontal wheel deltas, and stops at the ends', () => {
        const { view } = zoomedView();
        expect([view._rangeStart, view._rangeEnd]).to.deep.equal([1000, 2000]);

        // 80 px of an 800 px, 1000 ms view
        wheel(view, { deltaY: 80, shiftKey: true });
        expect(view._rangeStart).to.be.closeTo(1100, 1e-6);
        wheel(view, { deltaX: -80 });
        expect(view._rangeStart).to.be.closeTo(1000, 1e-6);

        wheel(view, { deltaX: 1e6 });
        expect([view._rangeStart, view._rangeEnd]).to.deep.equal([2000, 3000]);
        wheel(view, { deltaX: -1e6 });
        expect([view._rangeStart, view._rangeEnd]).to.deep.equal([0, 1000]);
      });

      it('still zooms on a plain vertical wheel', () => {
        const { view } = zoomedView();

        wheel(view, { deltaY: 1, clientX: view.msToX(1500) });

        expect(view._rangeEnd - view._rangeStart).to.be.closeTo(1200, 1e-6);
      });

      it('pans by dragging empty strip, and the click that ends the drag selects nothing', () => {
        const { view, events } = zoomedView();
        const touch = { pointerType: 'touch' };

        // The handle sits at 0 ms, off screen: this grabs the strip
        pointerDownTimeline(view, 400, touch);
        dispatchPointer(view.canvas, 'pointermove', 280, 10, touch);
        dispatchPointer(view.canvas, 'pointerup', 280, 10, touch);
        clickTimeline(view, 1500);

        // 120 px to the left: content follows the finger, the view moves 150 ms on
        expect(view._rangeStart).to.be.closeTo(1150, 1e-6);
        expect(events.scrubs).to.deep.equal([]);
        expect(events.selects).to.deep.equal([]);
      });

      it('takes a press that barely moves for a click', () => {
        const { view, events } = zoomedView();

        pointerDownTimeline(view, 400);
        dispatchPointer(view.canvas, 'pointermove', 402);
        dispatchPointer(view.canvas, 'pointerup', 402);
        clickTimeline(view, 1500);

        expect(view._rangeStart).to.equal(1000);
        expect(events.selects).to.have.length(1);
      });

      it('grabs the handle, not the strip, when the press lands on it', () => {
        const { view, events } = zoomedView();
        view.setCustomTime(1500);

        pointerDownTimeline(view, view.msToX(1500));
        dispatchPointer(view.canvas, 'pointermove', view.msToX(1500) + 100);
        dispatchPointer(view.canvas, 'pointerup', view.msToX(1500) + 100);

        expect(view._rangeStart).to.equal(1000);
        expect(events.scrubs.map(({ phase }) => phase)).to.deep.equal(['start', 'move', 'end']);
      });
    });

    it('does not pan by dragging while the whole timeline is in view', () => {
      const { timeline } = makeTimelineFixture();
      const { view, events } = mountView(timeline);

      pointerDownTimeline(view, 400);
      dispatchPointer(view.canvas, 'pointermove', 280);
      dispatchPointer(view.canvas, 'pointerup', 280);

      expect([view._rangeStart, view._rangeEnd]).to.deep.equal([0, 3000]);
      expect(events.scrubs).to.deep.equal([]);
    });
  });
});
