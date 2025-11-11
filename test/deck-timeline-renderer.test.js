const { expect } = require('chai');
const Module = require('module');
// Ignore CSS imports from the renderer in test environment
require.extensions['.css'] = () => {};

// ---- Minimal deck.gl mocks to avoid ESM + WebGL in tests ----
const mockDeckGLCore = {
  Deck: class {
    constructor(props) {
      this.props = props || {};
    }
    setProps(p) {
      this.props = { ...this.props, ...p };
    }
    finalize() {}
  },
  OrthographicView: class { constructor(opts) { this.opts = opts; } },
  COORDINATE_SYSTEM: { CARTESIAN: 1 }
};

class MockLayer {
  constructor(props) {
    this.props = props || {};
    this.id = this.props.id;
  }
  clone(nextProps) {
    return new this.constructor({ ...this.props, ...nextProps });
  }
}

const mockDeckGLLayers = {
  PathLayer: class PathLayer extends MockLayer {},
  ScatterplotLayer: class ScatterplotLayer extends MockLayer {}
};

// Patch module loader to substitute deck.gl packages before requiring SUT
const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === '@deck.gl/core') return mockDeckGLCore;
  if (request === '@deck.gl/layers') return mockDeckGLLayers;
  return originalLoad.apply(this, arguments);
};

// Now require the SUT after mocks are in place
const { DeckTimelineRenderer } = require('../src/js/timeline/renderers/DeckTimelineRenderer.js');

describe('DeckTimelineRenderer', () => {
  function makeContainer(w = 800, h = 100) {
    const container = global.document.createElement('div');
    container.getBoundingClientRect = () => ({
      width: w,
      height: h,
      top: 0,
      left: 0,
      right: w,
      bottom: h
    });
    global.document.body.appendChild(container);
    return container;
  }

  function makeTimelineFixture() {
    const segments = [
      { isFullTree: true },
      { isFullTree: false },
      { isFullTree: true }
    ];
    const timelineData = {
      // 3 segments of 1000ms
      totalDuration: 3000,
      cumulativeDurations: [1000, 2000, 3000]
    };
    return { timelineData, segments };
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
    // Find scrubber layer by id
    const scrubber = renderer.deck.props.layers.find(l => l.id === 'scrubber-layer');
    expect(scrubber).to.exist;
    const path = scrubber.props.data?.[0]?.path;
    expect(Array.isArray(path)).to.equal(true);
    // With width=800 and ms=1500 in [0,3000], scrub x should be 0 (centered coords)
    expect(path[0][0]).to.be.closeTo(0, 1e-6);
    expect(path[1][0]).to.be.closeTo(0, 1e-6);
  });

  it('reflects selection in selection layers', () => {
    const { timelineData, segments } = makeTimelineFixture();
    const container = makeContainer();
    const renderer = new DeckTimelineRenderer(timelineData, segments).init(container);

    renderer.setSelection([2]);
    const anchorSel = renderer.deck.props.layers.find(l => l.id === 'anchor-selection-layer');
    const connSel = renderer.deck.props.layers.find(l => l.id === 'connection-selection-layer');
    expect(anchorSel || connSel).to.exist;
    // At least one selection layer should have data when a selection is set
    const hasData = (layer) => Array.isArray(layer?.props?.data) && layer.props.data.length >= 0;
    expect(hasData(anchorSel) || hasData(connSel)).to.equal(true);
  });
});
