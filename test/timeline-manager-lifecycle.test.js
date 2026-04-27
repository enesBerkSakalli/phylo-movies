const { expect } = require('chai');
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const Module = require('module');

require.extensions['.css'] = () => { };

const dom = new JSDOM('<!doctype html><html><body></body></html>');
global.window = dom.window;
global.document = dom.window.document;
global.requestAnimationFrame = dom.window.requestAnimationFrame || ((cb) => setTimeout(cb, 0));
global.cancelAnimationFrame = dom.window.cancelAnimationFrame || ((id) => clearTimeout(id));

const mockDeckGLCore = {
  Deck: class {
    constructor(props) {
      this.props = props || {};
    }
    setProps(nextProps) {
      this.props = { ...this.props, ...nextProps };
    }
    finalize() { }
  },
  OrthographicView: class {
    constructor(opts) {
      this.opts = opts;
    }
  },
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
  PathLayer: class PathLayer extends MockLayer { },
  ScatterplotLayer: class ScatterplotLayer extends MockLayer { }
};

const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === '@deck.gl/core') return mockDeckGLCore;
  if (request === '@deck.gl/layers') return mockDeckGLLayers;
  return originalLoad.apply(this, arguments);
};

const { MovieTimelineManager } = require('../src/timeline/core/MovieTimelineManager.js');
const { useAppStore } = require('../src/state/phyloStore/store.js');

function loadMovieData() {
  const candidates = [
    path.join(__dirname, 'data', 'small_example', 'small_example.response.json'),
    path.join(__dirname, 'data', 'example.json')
  ];

  for (const filePath of candidates) {
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch { }
  }

  throw new Error('No input JSON found for timeline manager lifecycle test.');
}

function makeContainer(width = 800, height = 80) {
  const container = global.document.createElement('div');
  container.getBoundingClientRect = () => ({
    width,
    height,
    top: 0,
    left: 0,
    right: width,
    bottom: height
  });
  global.document.body.appendChild(container);
  return container;
}

describe('MovieTimelineManager lifecycle', () => {
  let movieData;

  before(() => {
    movieData = loadMovieData();
  });

  after(() => {
    Module._load = originalLoad;
  });

  afterEach(() => {
    useAppStore.setState({
      playing: false,
      animationProgress: 0,
      timelineProgress: null,
      currentTreeIndex: 0,
      hoveredSegmentIndex: null,
      hoveredSegmentData: null,
      hoveredSegmentPosition: null,
      isTooltipHovered: false
    });
  });

  it('can exist before a host container is available', () => {
    const manager = new MovieTimelineManager(movieData, { fullTreeIndices: [] });

    expect(manager.timeline).to.equal(null);
    expect(manager.container).to.equal(null);
    expect(manager.getSegmentCount()).to.be.greaterThan(0);
    expect(manager.getTimelineProgressForTreeIndex(0)).to.be.a('number');

    manager.destroy();
  });

  it('mounts into an explicit host and unmounts cleanly', () => {
    const manager = new MovieTimelineManager(movieData, { fullTreeIndices: [] });
    const host = makeContainer();

    manager.mount(host);

    expect(manager.container).to.equal(host);
    expect(manager.timeline).to.exist;
    expect(manager.timeline.container).to.equal(host);
    expect(host.children.length).to.equal(1);

    manager.unmount();

    expect(manager.timeline).to.equal(null);
    expect(manager.container).to.equal(null);
    expect(host.children.length).to.equal(0);
    expect(manager.getSegmentCount()).to.be.greaterThan(0);

    manager.destroy();
  });

  it('remounts into a new host without leaving stale DOM behind', () => {
    const manager = new MovieTimelineManager(movieData, { fullTreeIndices: [] });
    const firstHost = makeContainer(640, 60);
    const secondHost = makeContainer(720, 90);

    manager.mount(firstHost);
    expect(firstHost.children.length).to.equal(1);

    manager.mount(secondHost);

    expect(firstHost.children.length).to.equal(0);
    expect(secondHost.children.length).to.equal(1);
    expect(manager.container).to.equal(secondHost);
    expect(manager.timeline).to.exist;
    expect(manager.timeline.container).to.equal(secondHost);

    manager.destroy();
  });

  it('clears transient tooltip and hover state on unmount', () => {
    const manager = new MovieTimelineManager(movieData, { fullTreeIndices: [] });
    const host = makeContainer();

    useAppStore.setState({
      hoveredSegmentIndex: 2,
      hoveredSegmentData: { treeName: 'Example' },
      hoveredSegmentPosition: { x: 120, y: 40 },
      isTooltipHovered: true
    });

    manager.mount(host);
    manager.unmount();

    const state = useAppStore.getState();
    expect(state.isTooltipHovered).to.equal(false);
    expect(state.hoveredSegmentIndex).to.equal(null);
    expect(state.hoveredSegmentData).to.equal(null);
    expect(state.hoveredSegmentPosition).to.equal(null);

    manager.destroy();
  });

  it('restores scrubber position and segment selection on remount from store state', () => {
    const manager = new MovieTimelineManager(movieData, { fullTreeIndices: [] });
    const firstHost = makeContainer(640, 60);
    const secondHost = makeContainer(640, 60);

    useAppStore.setState({
      playing: false,
      animationProgress: 0.1,
      timelineProgress: 0.6
    });

    manager.mount(firstHost);

    const firstScrubberMs = manager.timeline._scrubberMs;
    const firstSelectedId = manager.timeline._selectedId;

    expect(firstScrubberMs).to.be.a('number');
    expect(firstSelectedId).to.be.a('number');

    manager.unmount();
    manager.mount(secondHost);

    expect(manager.timeline._scrubberMs).to.equal(firstScrubberMs);
    expect(manager.timeline._selectedId).to.equal(firstSelectedId);

    manager.destroy();
  });

  it('binds renderer scrub state to the scrub controller', async () => {
    const manager = new MovieTimelineManager(movieData, { fullTreeIndices: [] });
    const host = makeContainer();

    manager.mount(host);
    expect(manager.timeline.isScrubbing()).to.equal(false);

    await manager.scrubController.startScrubbing(0);
    expect(manager.timeline.isScrubbing()).to.equal(true);

    manager.scrubController.resetOnUnmount();
    expect(manager.timeline.isScrubbing()).to.equal(false);

    manager.destroy();
  });

  it('treats unmount after destroy as a no-op', () => {
    const manager = new MovieTimelineManager(movieData, { fullTreeIndices: [] });
    const host = makeContainer();

    manager.mount(host);
    manager.destroy();

    expect(() => manager.unmount()).to.not.throw();
    expect(manager.timeline).to.equal(null);
    expect(manager.container).to.equal(null);
  });
});
