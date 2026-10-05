const Module = require('module');
const path = require('path');

let installed = false;
let originalLoad = null;

function createDeckGLCoreMock() {
  return {
    Deck: class {
      constructor(props) {
        this.props = props || {};
        // Like the real Deck: its canvas goes into `parent` at once, but `deck.canvas` is only
        // set once the device is ready, long after construction. Code must not wait on it.
        this.element = global.document?.createElement('canvas') ?? null;
        this.props.parent?.appendChild?.(this.element);
      }

      setProps(nextProps) {
        this.props = { ...this.props, ...nextProps };
      }

      finalize() {
        this.element?.remove?.();
      }
    },
    OrthographicView: class {
      constructor(opts) {
        this.opts = opts;
      }
    },
    COORDINATE_SYSTEM: { CARTESIAN: 1 },
  };
}

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
  ScatterplotLayer: class ScatterplotLayer extends MockLayer {},
  TextLayer: class TextLayer extends MockLayer {},
  PolygonLayer: class PolygonLayer extends MockLayer {},
};

const mockDeckGLCore = createDeckGLCoreMock();

function installDeckGLMocks() {
  if (installed) {
    return { restore: restoreDeckGLMocks };
  }

  originalLoad = Module._load;
  Module._load = function (request, _parent, _isMain) {
    if (request === '@deck.gl/core') return mockDeckGLCore;
    if (request === '@deck.gl/layers') return mockDeckGLLayers;
    return originalLoad.apply(this, arguments);
  };
  installed = true;

  return { restore: restoreDeckGLMocks };
}

function restoreDeckGLMocks() {
  if (!installed) return;
  Module._load = originalLoad;
  originalLoad = null;
  installed = false;
}

function clearTimelineModuleCache() {
  [
    'src/timeline/timelineController.js',
    'src/timeline/TimelineView.js',
    'src/timeline/deckLayers.js',
  ].forEach((modulePath) => {
    const resolved = require.resolve(path.join(__dirname, '..', '..', modulePath));
    delete require.cache[resolved];
  });
}

module.exports = {
  clearTimelineModuleCache,
  installDeckGLMocks,
};
