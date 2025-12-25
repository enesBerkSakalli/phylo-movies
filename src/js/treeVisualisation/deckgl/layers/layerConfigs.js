/**
 * Layer configuration objects for deck.gl layers
 * Centralizes IDs and default props for all tree visualization layers
 */
import { PathLayer, ScatterplotLayer, TextLayer } from '@deck.gl/layers';
import { PathStyleExtension } from '@deck.gl/extensions';

// Hover highlight color: semi-transparent cyan for good contrast with blue/red data highlights
export const HOVER_HIGHLIGHT_COLOR = [0, 200, 220, 150];

// Minimum node radius for internal nodes
export const MIN_NODE_RADIUS = 3;

/**
 * Shared default props for PathLayer-based layers
 */
const pathLayerDefaults = {
  widthUnits: 'pixels',
  widthMinPixels: 0,
  jointRounded: true,
  capRounded: true
};

/**
 * PathStyleExtension instance for dashed line support
 * highPrecisionDash improves dash rendering quality for wider strokes
 */
const pathStyleExtension = new PathStyleExtension({ dash: true, highPrecisionDash: true });

/**
 * Layer configurations keyed by layer name
 */
export const LAYER_CONFIGS = {
  linkOutlines: {
    id: 'phylo-link-outlines',
    LayerClass: PathLayer,
    defaultProps: {
      ...pathLayerDefaults,
      // Disable rounded caps for dashed lines - rounded caps can fill gaps
      capRounded: false,
      extensions: [pathStyleExtension] // Enable dashing support for outline
    }
  },
  links: {
    id: 'phylo-links',
    LayerClass: PathLayer,
    defaultProps: {
      ...pathLayerDefaults,
      // Disable rounded caps for dashed lines - rounded caps can fill gaps
      capRounded: false,
      extensions: [pathStyleExtension] // Enable dashing support
    }
  },
  extensions: {
    id: 'phylo-extensions',
    LayerClass: PathLayer,
    defaultProps: { ...pathLayerDefaults }
  },
  nodes: {
    id: 'phylo-nodes',
    LayerClass: ScatterplotLayer,
    defaultProps: {
      lineWidthUnits: 'pixels',
      radiusUnits: 'pixels',
      radiusMinPixels: 0,
      getLineWidth: 3
    }
  },
  labels: {
    id: 'phylo-labels',
    LayerClass: TextLayer,
    defaultProps: {
      getAlignmentBaseline: 'center'
    }
  },
  connectors: {
    id: 'phylo-connectors',
    LayerClass: PathLayer,
    defaultProps: {
      ...pathLayerDefaults,
      widthMinPixels: 1,
      pickable: true
    }
  }
};
