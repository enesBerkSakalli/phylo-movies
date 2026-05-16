const Module = require('module');
const path = require('path');

let installed = false;
let originalLoad = null;

function createDeckGLCoreMock() {
  return {
    Deck: class {
      constructor(props) {
        this.props = props || {};
        this.eventListeners = [];
        this.canvas = global.document?.createElement('canvas') ?? null;

        if (this.canvas) {
          this.canvas.getBoundingClientRect = () => this.props.parent.getBoundingClientRect();
          const addEventListener = this.canvas.addEventListener.bind(this.canvas);
          const removeEventListener = this.canvas.removeEventListener.bind(this.canvas);

          this.canvas.addEventListener = (event, handler, options) => {
            this.eventListeners.push({ event, handler, options });
            addEventListener(event, handler, options);
          };

          this.canvas.removeEventListener = (event, handler, options) => {
            this.eventListeners = this.eventListeners.filter(
              (entry) => entry.event !== event || entry.handler !== handler
            );
            removeEventListener(event, handler, options);
          };

          this.props.parent?.appendChild?.(this.canvas);
        }
      }

      setProps(nextProps) {
        this.props = { ...this.props, ...nextProps };
      }

      finalize() {
        this.canvas?.remove?.();
      }
    },
    OrthographicView: class {
      constructor(opts) {
        this.opts = opts;
      }
    },
    COORDINATE_SYSTEM: { CARTESIAN: 1 }
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
  PathLayer: class PathLayer extends MockLayer { },
  ScatterplotLayer: class ScatterplotLayer extends MockLayer { },
  TextLayer: class TextLayer extends MockLayer { },
  PolygonLayer: class PolygonLayer extends MockLayer { },
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
    'src/timeline/core/MovieTimelineManager.js',
    'src/timeline/renderers/DeckTimelineRenderer.js',
    'src/timeline/utils/layerFactories.js',
  ].forEach((modulePath) => {
    const resolved = require.resolve(path.join(__dirname, '..', '..', modulePath));
    delete require.cache[resolved];
  });
}

module.exports = {
  clearTimelineModuleCache,
  installDeckGLMocks,
};
