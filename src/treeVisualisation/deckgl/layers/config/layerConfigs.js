/**
 * Layer configuration objects for deck.gl layers
 * Centralizes IDs and default props for all tree visualization layers
 */
import { PathLayer, ScatterplotLayer, TextLayer } from '@deck.gl/layers';
import { PathStyleExtension } from '@deck.gl/extensions';
import { CLIPBOARD_LAYER_ID_PREFIX, LAYER_ID_PREFIX } from '../../constants/layerIds.js';
import { themeColor } from '../../../../services/ui/colorUtils.js';

// The theme's --signal (the pointer's colour): hover is semi-transparent, a selection opaque.
export const SIGNAL_COLOR = themeColor('--signal', [8, 145, 178]);
export const HOVER_HIGHLIGHT_COLOR = [...SIGNAL_COLOR, 150];

// Minimum node radius for internal nodes
export const MIN_NODE_RADIUS = 3;
const NODE_RADIUS_MIN_PIXELS = 1;
// Tailwind's default sans stack, which the app UI uses (deck.gl's own default is Monaco).
export const LABEL_FONT_FAMILY = 'ui-sans-serif, system-ui, sans-serif';
// Nodes are screen-sized so zooming in separates crowded tips instead of growing them.
const NODE_RADIUS_MAX_PIXELS = 8;

// Node border (stroke) widths
export const INNER_NODE_STROKE_WIDTH = 0.2;
export const OUTER_NODE_STROKE_WIDTH = 0.2;

// Branch, guide-line and connector widths are screen pixels (the Branch Width setting is a
// pixel weight at the fit zoom). Link and extension layers follow the camera moderately through
// their widthScale prop, see styles/links/zoomWidthScale.js.
const pathLayerDefaults = {
  _pathType: 'open',
  widthUnits: 'pixels',
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
      lineWidthUnits: 'pixels',
      radiusUnits: 'pixels',
      radiusMinPixels: NODE_RADIUS_MIN_PIXELS,
      radiusMaxPixels: NODE_RADIUS_MAX_PIXELS,
      stroked: true,
    },
  },
  labels: {
    id: `${LAYER_ID_PREFIX}-labels`,
    LayerClass: TextLayer,
    defaultProps: {
      // Screen-sized text in the app's sans stack; SDF keeps glyphs and the halo crisp.
      sizeUnits: 'pixels',
      fontFamily: LABEL_FONT_FAMILY,
      getAlignmentBaseline: 'center',
      billboard: true,
      characterSet: 'auto',
      fontSettings: { sdf: true },
    },
  },
  supportLabels: {
    id: `${LAYER_ID_PREFIX}-support-labels`,
    LayerClass: TextLayer,
    defaultProps: {
      sizeUnits: 'pixels',
      fontFamily: LABEL_FONT_FAMILY,
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
};
