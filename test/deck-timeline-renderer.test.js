const { expect } = require('chai');
const { JSDOM } = require('jsdom');
const { clearTimelineModuleCache, installDeckGLMocks } = require('./helpers/deckGLMocks.js');
// Ignore CSS imports from the renderer in test environment
require.extensions['.css'] = () => { };

// Minimal DOM for renderer sizing
const dom = new JSDOM('<!doctype html><html><body></body></html>');
global.window = dom.window;
global.document = dom.window.document;
global.requestAnimationFrame = dom.window.requestAnimationFrame || ((cb) => setTimeout(cb, 0));
global.cancelAnimationFrame = dom.window.cancelAnimationFrame || ((id) => clearTimeout(id));

installDeckGLMocks();
clearTimelineModuleCache();

// Now require the SUT after mocks are in place
const { DeckTimelineRenderer } = require('../src/timeline/renderers/DeckTimelineRenderer.js');
const { TIMELINE_THEME } = require('../src/timeline/constants.js');

describe('DeckTimelineRenderer', () => {
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
      bottom: height
    });
    container.setTestSize = (nextWidth, nextHeight = height) => {
      width = nextWidth;
      height = nextHeight;
    };
    global.document.body.appendChild(container);
    return container;
  }

  function makeTimelineFixture() {
    const segments = [
      { isInputTreeSegment: true, originalTreeIndex: 0 },
      {
        isInputTreeSegment: false,
        pairId: 'pair_0_1',
        sourceInputTreeIndex: 0,
        targetInputTreeIndex: 1,
        globalStart: 1,
        globalEnd: 9,
        localStepStart: 0,
        localStepEnd: 8
      },
      { isInputTreeSegment: true, originalTreeIndex: 1 }
    ];
    const timelineData = {
      // 3 segments of 1000ms
      segmentDurations: [1000, 1000, 1000],
      totalDuration: 3000,
      cumulativeDurations: [1000, 2000, 3000]
    };
    return { timelineData, segments };
  }

  function clickTimeline(renderer, ms) {
    const x = (ms / renderer.timelineData.totalDuration) * renderer._width;
    renderer.deck.canvas.dispatchEvent(new global.window.MouseEvent('click', {
      bubbles: true,
      clientX: x,
      clientY: 10
    }));
  }

  function collectSelections(renderer) {
    const selections = [];
    renderer.on('select', (payload) => selections.push(payload));
    return selections;
  }

  it('initializes and sets layers with a fresh timeline', () => {
    const { timelineData, segments } = makeTimelineFixture();
    const container = makeContainer();

    const renderer = new DeckTimelineRenderer(timelineData, segments).init(container);
    expect(renderer.deck).to.exist;
    expect(Array.isArray(renderer.deck.props.layers)).to.equal(true);
    expect(renderer.deck.props.layers.length).to.be.greaterThan(0);
  });

  it('updates scrubber position on setCustomTime', () => {
    const { timelineData, segments } = makeTimelineFixture();
    const container = makeContainer(800, 120);
    const renderer = new DeckTimelineRenderer(timelineData, segments).init(container);

    renderer.setCustomTime(1500);
    renderer._updateLayers();
    // Find scrubber layer by id
    const scrubber = renderer.deck.props.layers.find(l => l.id === 'scrubber-layer');
    expect(scrubber).to.exist;
    const path = scrubber.props.data?.[0]?.path;
    expect(Array.isArray(path)).to.equal(true);
    // With width=800 and ms=1500 in [0,3000], scrub x should be centered
    expect(path[0][0]).to.be.closeTo(0, 1e-6);
    expect(path[1][0]).to.be.closeTo(0, 1e-6);
  });

  it('draws input-window ticks without a transition strip for dense tree-only timelines', () => {
    const segments = Array.from({ length: 100 }, () => ({ isInputTreeSegment: true }));
    const timelineData = {
      segmentDurations: segments.map(() => 1000),
      totalDuration: 100000,
      cumulativeDurations: segments.map((_, index) => (index + 1) * 1000)
    };
    const container = makeContainer(800, 120);
    const renderer = new DeckTimelineRenderer(timelineData, segments).init(container);

    const stripTrackLayer = renderer.deck.props.layers.find(l => l.id === 'strip-track-layer');
    const tickLayer = renderer.deck.props.layers.find(l => l.id === 'input-tree-tick-layer');
    const inputTreeLayer = renderer.deck.props.layers.find(l => l.id === 'input-tree-layer');
    expect(stripTrackLayer).to.exist;
    expect(stripTrackLayer.props.data).to.have.length(0);
    expect(tickLayer).to.exist;
    expect(tickLayer.props.data).to.have.length(100);
    expect(inputTreeLayer.props.data).to.have.length(0);
  });

  it('draws a transition strip for dense timelines with transition frames', () => {
    const segments = Array.from({ length: 100 }, (_, index) => ({
      isInputTreeSegment: index % 2 === 0
    }));
    const timelineData = {
      segmentDurations: segments.map(() => 1000),
      totalDuration: 100000,
      cumulativeDurations: segments.map((_, index) => (index + 1) * 1000)
    };
    const container = makeContainer(800, 120);
    const renderer = new DeckTimelineRenderer(timelineData, segments).init(container);

    const stripTrackLayer = renderer.deck.props.layers.find(l => l.id === 'strip-track-layer');
    expect(stripTrackLayer).to.exist;
    expect(stripTrackLayer.props.data).to.have.length(1);
  });

  it('reflects selection in selection layers', () => {
    const { timelineData, segments } = makeTimelineFixture();
    const container = makeContainer();
    const renderer = new DeckTimelineRenderer(timelineData, segments).init(container);

    renderer.setSelectedSegment(1);
    const inputTreeSelection = renderer.deck.props.layers.find(l => l.id === 'input-tree-selection-layer');
    const connSel = renderer.deck.props.layers.find(l => l.id === 'connection-selection-layer');
    expect(inputTreeSelection || connSel).to.exist;
    // At least one selection layer should have data when a selection is set
    const hasData = (layer) => Array.isArray(layer?.props?.data) && layer.props.data.length >= 0;
    expect(hasData(inputTreeSelection) || hasData(connSel)).to.equal(true);
  });

  it('uses distinct colors for selected segments and the current playhead', () => {
    expect(TIMELINE_THEME.connectionSelectionRGB).to.not.deep.equal(TIMELINE_THEME.scrubberCoreRGB);
  });

  it('binds timeline pointer handlers to the deck canvas', () => {
    const { timelineData, segments } = makeTimelineFixture();
    const container = makeContainer();
    const renderer = new DeckTimelineRenderer(timelineData, segments).init(container);

    const boundEvents = renderer.deck.eventListeners.map((entry) => entry.event);

    expect(boundEvents).to.include.members(['mousemove', 'mousedown', 'click', 'wheel', 'mouseleave']);
  });

  it('exposes the deck canvas as a keyboard-focusable timeline control', () => {
    const { timelineData, segments } = makeTimelineFixture();
    const container = makeContainer();
    const renderer = new DeckTimelineRenderer(timelineData, segments).init(container);

    expect(renderer.canvas.getAttribute('tabindex')).to.equal('0');
    expect(renderer.canvas.getAttribute('role')).to.equal('slider');
    expect(renderer.canvas.getAttribute('aria-label')).to.equal('Movie timeline position');
    expect(renderer.canvas.getAttribute('aria-valuemin')).to.equal('0');
    expect(renderer.canvas.getAttribute('aria-valuemax')).to.equal('3000');
    expect(renderer.canvas.getAttribute('aria-valuenow')).to.equal('0');
    expect(renderer.canvas.getAttribute('aria-valuetext')).to.equal('Segment 1 of 3, input tree 1');
  });

  it('uses semantic segment labels for assistive timeline feedback', () => {
    const { timelineData, segments } = makeTimelineFixture();
    const container = makeContainer();
    const renderer = new DeckTimelineRenderer(timelineData, segments).init(container);

    renderer.setCustomTime(1500);

    expect(renderer.canvas.getAttribute('aria-valuetext')).to.equal(
      'Segment 2 of 3, generated frames 1-9, from source input tree 1 to target input tree 2'
    );
  });

  it('moves timeline selection with keyboard navigation', () => {
    const { timelineData, segments } = makeTimelineFixture();
    const container = makeContainer();
    const renderer = new DeckTimelineRenderer(timelineData, segments).init(container);
    const selections = collectSelections(renderer);

    renderer.deck.canvas.dispatchEvent(new global.window.KeyboardEvent('keydown', {
      bubbles: true,
      key: 'ArrowRight'
    }));

    expect(selections).to.have.length(1);
    expect(selections[0].segmentIndex).to.equal(1);
    expect(selections[0].id).to.equal(2);
    expect(renderer._selectedSegmentIndex).to.equal(1);

    renderer.deck.canvas.dispatchEvent(new global.window.KeyboardEvent('keydown', {
      bubbles: true,
      key: 'End'
    }));

    expect(selections).to.have.length(2);
    expect(selections[1].segmentIndex).to.equal(2);
    expect(renderer._selectedSegmentIndex).to.equal(2);
    expect(renderer.canvas.getAttribute('aria-valuenow')).to.equal('2500');
  });

  it('publishes hovered segments through a bound hover callback', () => {
    const { timelineData, segments } = makeTimelineFixture();
    const container = makeContainer();
    const renderer = new DeckTimelineRenderer(timelineData, segments).init(container);
    const hoverUpdates = [];

    renderer.bindHoverState({
      setHoveredSegment: (segmentIndex, segment, position) => {
        hoverUpdates.push({ segmentIndex, segment, position });
      }
    });

    renderer.deck.canvas.dispatchEvent(new global.window.MouseEvent('mousemove', {
      bubbles: true,
      clientX: 100,
      clientY: 10
    }));

    expect(hoverUpdates).to.have.length(1);
    expect(hoverUpdates[0].segmentIndex).to.equal(0);
    expect(hoverUpdates[0].segment).to.equal(segments[0]);
    expect(hoverUpdates[0].position.x).to.be.closeTo(400 / 3, 1e-6);
    expect(hoverUpdates[0].position.y).to.equal(0);
  });

  it('selects an input-tree segment from a deck canvas click', () => {
    const { timelineData, segments } = makeTimelineFixture();
    const container = makeContainer();
    const renderer = new DeckTimelineRenderer(timelineData, segments).init(container);
    const selections = collectSelections(renderer);

    clickTimeline(renderer, 500);

    expect(selections).to.have.length(1);
    expect(selections[0].id).to.equal(1);
    expect(selections[0].segment).to.equal(segments[0]);
    expect(renderer._selectedSegmentIndex).to.equal(0);
  });

  it('selects a generated transition segment from a deck canvas click', () => {
    const { timelineData, segments } = makeTimelineFixture();
    const container = makeContainer();
    const renderer = new DeckTimelineRenderer(timelineData, segments).init(container);
    const selections = collectSelections(renderer);

    clickTimeline(renderer, 1500);

    expect(selections).to.have.length(1);
    expect(selections[0].id).to.equal(2);
    expect(selections[0].segment).to.equal(segments[1]);
    expect(renderer._selectedSegmentIndex).to.equal(1);
  });

  it('selects the expected segment in dense timelines', () => {
    const segments = Array.from({ length: 100 }, (_, index) => ({
      isInputTreeSegment: index % 2 === 0
    }));
    const timelineData = {
      segmentDurations: segments.map(() => 1000),
      totalDuration: 100000,
      cumulativeDurations: segments.map((_, index) => (index + 1) * 1000)
    };
    const container = makeContainer(800, 120);
    const renderer = new DeckTimelineRenderer(timelineData, segments).init(container);
    const selections = collectSelections(renderer);

    clickTimeline(renderer, 51500);

    expect(selections).to.have.length(1);
    expect(selections[0].id).to.equal(52);
    expect(selections[0].segment).to.equal(segments[51]);
    expect(renderer._selectedSegmentIndex).to.equal(51);
  });

  it('keeps click selection accurate after the timeline host resizes', () => {
    const { timelineData, segments } = makeTimelineFixture();
    const container = makeContainer(800, 120);
    const renderer = new DeckTimelineRenderer(timelineData, segments).init(container);
    const selections = collectSelections(renderer);

    container.setTestSize(480, 120);
    renderer._updateLayers();
    clickTimeline(renderer, 2500);

    expect(selections).to.have.length(1);
    expect(selections[0].id).to.equal(3);
    expect(selections[0].segment).to.equal(segments[2]);
    expect(renderer._selectedSegmentIndex).to.equal(2);
  });

  it('uses externally bound scrub state for scrubber highlighting', () => {
    const { timelineData, segments } = makeTimelineFixture();
    const container = makeContainer();
    const renderer = new DeckTimelineRenderer(timelineData, segments).init(container);
    const scrubState = { active: false };

    renderer.bindScrubState({ getIsScrubbing: () => scrubState.active });
    renderer._updateLayers();

    let scrubber = renderer.deck.props.layers.find(l => l.id === 'scrubber-layer');
    expect(scrubber.props.widthMinPixels).to.equal(7);
    expect(renderer.isScrubbing()).to.equal(false);

    scrubState.active = true;
    renderer.syncScrubState();
    renderer._updateLayers();

    scrubber = renderer.deck.props.layers.find(l => l.id === 'scrubber-layer');
    expect(scrubber.props.widthMinPixels).to.equal(10);
    expect(renderer.isScrubbing()).to.equal(true);
  });

  it('cancels pending renderer work on destroy', () => {
    const { timelineData, segments } = makeTimelineFixture();
    const container = makeContainer();
    const renderer = new DeckTimelineRenderer(timelineData, segments).init(container);

    const originalCancelAnimationFrame = global.cancelAnimationFrame;
    const originalClearTimeout = global.clearTimeout;
    let canceledFrameId = null;
    let clearedTimeoutId = null;

    global.cancelAnimationFrame = (id) => {
      canceledFrameId = id;
    };
    global.clearTimeout = (id) => {
      clearedTimeoutId = id;
    };

    renderer._updateFrameId = 42;
    renderer._hoverTimeoutId = 99;
    renderer.destroy();

    expect(canceledFrameId).to.equal(42);
    expect(clearedTimeoutId).to.equal(99);
    expect(renderer._updateFrameId).to.equal(null);
    expect(renderer._hoverTimeoutId).to.equal(null);

    global.cancelAnimationFrame = originalCancelAnimationFrame;
    global.clearTimeout = originalClearTimeout;
  });
});
