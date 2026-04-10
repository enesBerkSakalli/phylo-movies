/**
 * Layer configuration objects for deck.gl layers
 * Centralizes IDs and default props for all tree visualization layers
 */
import { PathLayer, ScatterplotLayer, TextLayer } from '@deck.gl/layers';
import { PathStyleExtension } from '@deck.gl/extensions';

// Hover highlight color: semi-transparent cyan for good contrast with blue/red data highlights
export const HOVER_HIGHLIGHT_COLOR = [0, 200, 220, 150];

export const LAYER_ID_PREFIX = 'phylo';
export const HISTORY_LAYER_ID_PREFIX = `${LAYER_ID_PREFIX}-history`;
export const CLIPBOARD_LAYER_ID_PREFIX = `${LAYER_ID_PREFIX}-clipboard`;

// Minimum node radius for internal nodes
export const MIN_NODE_RADIUS = 3;

// Base Z-offset for nodes to prevent Z-fighting and ensure they render above links
export const Z_NODE = 0.05;

// Node border (stroke) widths
export const INNER_NODE_STROKE_WIDTH = 0.2;
export const OUTER_NODE_STROKE_WIDTH = 0.2;

// Z-offsets for "History" / Highlighted Subtrees
// Order: Nodes (Highest) > Links > Labels
export const HISTORY_NODE_Z_OFFSET = 0.3;
export const HISTORY_LINK_Z_OFFSET = 0.2;
export const HISTORY_LABEL_Z_OFFSET = 0.1;

const pathLayerDefaults = {
  widthUnits: 'common',
  widthMinPixels: 1,
  jointRounded: false, // Optimization: save attribute slots
  capRounded: false     // Optimization: save attribute slots
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
      extensions: [pathStyleExtension] // Enable dashing support for outline
    }
  },
  links: {
    id: `${LAYER_ID_PREFIX}-links`,
    LayerClass: PathLayer,
    defaultProps: {
      ...pathLayerDefaults,
      // Disable rounded caps for dashed lines - rounded caps can fill gaps
      capRounded: false,
      extensions: [pathStyleExtension] // Enable dashing support
    }
  },
  extensions: {
    id: `${LAYER_ID_PREFIX}-extensions`,
    LayerClass: PathLayer,
    defaultProps: {
      ...pathLayerDefaults,
      capRounded: false,
      extensions: [pathStyleExtension]
    }
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
      pointSize: 10
    }
  },
  labels: {
    id: `${LAYER_ID_PREFIX}-labels`,
    LayerClass: TextLayer,
    defaultProps: {
      sizeUnits: 'common',  // Labels stay fixed screen size like nodes and links
      getAlignmentBaseline: 'center',
      billboard: true,
      characterSet: 'auto',
      fontSettings: { sdf: true } // Enable SDF globally for all text layers
    }
  },
  connectors: {
    id: `${LAYER_ID_PREFIX}-connectors`,
    LayerClass: PathLayer,
    defaultProps: {
      ...pathLayerDefaults,
      widthMinPixels: 1,
      pickable: true
    }
  }
};

/**
 * Clipboard layer configurations - same as LAYER_CONFIGS but with 'phylo-clipboard-' prefix
 */
export const CLIPBOARD_LAYER_CONFIGS = {
  linkOutlines: {
    ...LAYER_CONFIGS.linkOutlines,
    id: `${CLIPBOARD_LAYER_ID_PREFIX}-link-outlines`
  },
  links: {
    ...LAYER_CONFIGS.links,
    id: `${CLIPBOARD_LAYER_ID_PREFIX}-links`
  },
  extensions: {
    ...LAYER_CONFIGS.extensions,
    id: `${CLIPBOARD_LAYER_ID_PREFIX}-extensions`
  },
  nodes: {
    ...LAYER_CONFIGS.nodes,
    id: `${CLIPBOARD_LAYER_ID_PREFIX}-nodes`
  },
  labels: {
    ...LAYER_CONFIGS.labels,
    id: `${CLIPBOARD_LAYER_ID_PREFIX}-labels`
  },
  labelDots: {
    id: `${CLIPBOARD_LAYER_ID_PREFIX}-label-dots`,
    LayerClass: ScatterplotLayer,
    defaultProps: {
      radiusUnits: 'common',
      radiusMinPixels: 2,
      radiusMaxPixels: 6,
      stroked: false,
      billboard: true
    }
  },
  connectors: {
    ...LAYER_CONFIGS.connectors,
    id: `${CLIPBOARD_LAYER_ID_PREFIX}-connectors`
  }
};

export const HISTORY_DEPTH_PARAMETERS = {
  depthCompare: 'always',
  depthWriteEnabled: false
};

export const HISTORY_LINKS_CONFIG = {
  ...LAYER_CONFIGS.links,
  id: `${HISTORY_LAYER_ID_PREFIX}-links`,
  defaultProps: {
    ...LAYER_CONFIGS.links.defaultProps,
    parameters: HISTORY_DEPTH_PARAMETERS
  }
};

export const HISTORY_LINKS_HALO_CONFIG = {
  ...LAYER_CONFIGS.links,
  id: `${HISTORY_LAYER_ID_PREFIX}-links-halo`,
  defaultProps: {
    ...LAYER_CONFIGS.links.defaultProps,
    parameters: HISTORY_DEPTH_PARAMETERS
  }
};
