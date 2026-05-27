/**
 * Layer configuration objects for deck.gl layers
 * Centralizes IDs and default props for all tree visualization layers
 */
import { PathLayer, ScatterplotLayer, TextLayer } from '@deck.gl/layers';
import { PathStyleExtension } from '@deck.gl/extensions';
import { HISTORY_LABEL_Z_OFFSET, HISTORY_NODE_Z_OFFSET, Z_NODE } from '../../constants/zOffsets.js';

// Hover highlight color: semi-transparent cyan for good contrast with blue/red data highlights
export const HOVER_HIGHLIGHT_COLOR = [0, 200, 220, 150];

export const LAYER_ID_PREFIX = 'phylo';
export const CLIPBOARD_LAYER_ID_PREFIX = `${LAYER_ID_PREFIX}-clipboard`;

// Minimum node radius for internal nodes
export const MIN_NODE_RADIUS = 3;

// Base Z-offset for nodes to prevent Z-fighting and ensure they render above links
export { Z_NODE };

// Node border (stroke) widths
export const INNER_NODE_STROKE_WIDTH = 0.2;
export const OUTER_NODE_STROKE_WIDTH = 0.2;

// Z-offsets for previously moved subtree highlights.
export { HISTORY_NODE_Z_OFFSET, HISTORY_LABEL_Z_OFFSET };

const pathLayerDefaults = {
  _pathType: 'open',
  widthUnits: 'common',
  widthMinPixels: 1,
  jointRounded: false, // Optimization: save attribute slots
  capRounded: false, // Optimization: save attribute slots
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
    id: `${LAYER_ID_PREFIX}-link-outlines`,
    LayerClass: PathLayer,
    defaultProps: {
      ...pathLayerDefaults,
      // Disable rounded caps for dashed lines - rounded caps can fill gaps
      capRounded: false,
      extensions: [pathStyleExtension], // Enable dashing support for outline
    },
  },
  links: {
    id: `${LAYER_ID_PREFIX}-links`,
    LayerClass: PathLayer,
    defaultProps: {
      ...pathLayerDefaults,
      // Disable rounded caps for dashed lines - rounded caps can fill gaps
      capRounded: false,
      extensions: [pathStyleExtension], // Enable dashing support
    },
  },
  extensions: {
    id: `${LAYER_ID_PREFIX}-extensions`,
    LayerClass: PathLayer,
    defaultProps: {
      ...pathLayerDefaults,
      capRounded: false,
      extensions: [pathStyleExtension],
    },
  },
  nodes: {
    id: `${LAYER_ID_PREFIX}-nodes`,
    LayerClass: ScatterplotLayer,
    defaultProps: {
      lineWidthUnits: 'common',
      radiusUnits: 'common',
      radiusMinPixels: 2,
      stroked: true,
      billboard: true,
      pointSize: 10,
    },
  },
  labels: {
    id: `${LAYER_ID_PREFIX}-labels`,
    LayerClass: TextLayer,
    defaultProps: {
      sizeUnits: 'common', // Labels stay fixed screen size like nodes and links
      getAlignmentBaseline: 'center',
      billboard: true,
      characterSet: 'auto',
      fontSettings: { sdf: true }, // Enable SDF globally for all text layers
    },
  },
  supportLabels: {
    id: `${LAYER_ID_PREFIX}-support-labels`,
    LayerClass: TextLayer,
    defaultProps: {
      sizeUnits: 'common',
      getAlignmentBaseline: 'center',
      billboard: true,
      characterSet: 'auto',
      fontSettings: { sdf: true },
    },
  },
  connectors: {
    id: `${LAYER_ID_PREFIX}-connectors`,
    LayerClass: PathLayer,
    defaultProps: {
      ...pathLayerDefaults,
      widthMinPixels: 1,
      pickable: false,
    },
  },
};

/**
 * Clipboard layer configurations - same as LAYER_CONFIGS but with 'phylo-clipboard-' prefix
 */
export const CLIPBOARD_LAYER_CONFIGS = {
  linkOutlines: {
    ...LAYER_CONFIGS.linkOutlines,
    id: `${CLIPBOARD_LAYER_ID_PREFIX}-link-outlines`,
  },
  links: {
    ...LAYER_CONFIGS.links,
    id: `${CLIPBOARD_LAYER_ID_PREFIX}-links`,
  },
  extensions: {
    ...LAYER_CONFIGS.extensions,
    id: `${CLIPBOARD_LAYER_ID_PREFIX}-extensions`,
  },
  nodes: {
    ...LAYER_CONFIGS.nodes,
    id: `${CLIPBOARD_LAYER_ID_PREFIX}-nodes`,
  },
  labels: {
    ...LAYER_CONFIGS.labels,
    id: `${CLIPBOARD_LAYER_ID_PREFIX}-labels`,
  },
  supportLabels: {
    ...LAYER_CONFIGS.supportLabels,
    id: `${CLIPBOARD_LAYER_ID_PREFIX}-support-labels`,
  },
  labelDots: {
    id: `${CLIPBOARD_LAYER_ID_PREFIX}-label-dots`,
    LayerClass: ScatterplotLayer,
    defaultProps: {
      radiusUnits: 'common',
      radiusMinPixels: 2,
      radiusMaxPixels: 6,
      stroked: false,
      billboard: true,
    },
  },
  connectors: {
    ...LAYER_CONFIGS.connectors,
    id: `${CLIPBOARD_LAYER_ID_PREFIX}-connectors`,
  },
};
