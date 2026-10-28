/**
 * Factory for labels layer
 */
import { RECTANGULAR_WORLD_EXTENT } from '../../../../layout/RectangularLayout.js';
import { LAYOUT_PROJECTION_MODES } from '../../../../layout/hyperbolicProjection/index.js';
import { themeColor } from '../../../../../services/ui/colorUtils.js';
import {
  getHistoryOffset,
  addZOffset,
  normalizeTextAnchor,
} from '../../styles/labels/labelUtils.js';

// The Label Size setting is a multiplier: its default (1.8 em) leaves the size below unchanged.
const DEFAULT_LABEL_EM = 1.8;
// Radial and unrooted labels have a fixed readable size.
const RADIAL_LABEL_PX = 11;
// Row labels fill this share of the row pitch, within these pixel bounds; rows too tight for the
// minimum show no names rather than a sample.
const ROW_LABEL_FILL = 0.8;
const ROW_LABEL_MIN_PX = 9;
const ROW_LABEL_MAX_PX = 14;
// The theme background, so connector lines crossing a label do not cut the text.
const LABEL_HALO_COLOR = [...themeColor('--background', [255, 255, 255]), 230];

// Space a name needs along the line of leaves (its height and the gap kept around it): rows
// show names from the pitch their size and fill allow; other layouts have a fixed-size name.
const NAME_GAP_PX = 6;

/** Leaf spacing on screen from which names can be placed at all. */
export function minNameSpacingPx(projectionMode) {
  return projectionMode === LAYOUT_PROJECTION_MODES.RECTANGULAR
    ? ROW_LABEL_MIN_PX / ROW_LABEL_FILL
    : RADIAL_LABEL_PX + NAME_GAP_PX;
}

/** Distance between neighbouring rectangular rows on screen. */
export function rowPitchPx(rowCount, zoom) {
  if (!(rowCount > 1)) return Infinity;
  return (RECTANGULAR_WORLD_EXTENT / (rowCount - 1)) * 2 ** (Number.isFinite(zoom) ? zoom : 0);
}

/**
 * Label text size in pixels: fixed for radial and unrooted trees, following the row pitch for
 * rectangular rows (pass `pitchPx`), times the Label Size setting.
 */
export function labelPixelSize(fontSize, pitchPx = null) {
  const em = parseFloat(fontSize);
  const factor = (Number.isFinite(em) ? em : DEFAULT_LABEL_EM) / DEFAULT_LABEL_EM;
  if (pitchPx === null) return RADIAL_LABEL_PX * factor;
  const base = Math.min(ROW_LABEL_MAX_PX, Math.max(ROW_LABEL_MIN_PX, pitchPx * ROW_LABEL_FILL));
  return base * factor;
}

/**
 * The names to draw and their text size. Rectangular rows show all names or none: all once the
 * rows are at least as far apart as the text is tall (and the minimum size is reached).
 */
export function resolveNameLabels(labels, state) {
  if (labels[0]?.projectionMode !== LAYOUT_PROJECTION_MODES.RECTANGULAR) {
    return { names: labels, sizePx: labelPixelSize(state?.fontSize) };
  }
  const pitch = rowPitchPx(state?.taxaCount || labels.length, state?.zoom);
  const sizePx = labelPixelSize(state?.fontSize, pitch);
  const fits = pitch * ROW_LABEL_FILL >= ROW_LABEL_MIN_PX && sizePx <= pitch;
  return { names: fits ? labels : [], sizePx };
}

export function getLabelsLayerProps(labels, state, layerStyles) {
  const { taxaColorVersion, colorVersion, fontSize, highlightColorMode } = state || {};
  const taxaCount = state?.taxaCount ?? 0;

  // Get cached state once for all accessors
  const cached = layerStyles.getCachedState(state);
  // Highlight emphasis is kept as a ratio of the style's base label size.
  const baseStyleSize = layerStyles.getLabelSize(null, cached) || 1;
  // Rectangular rows show all names or none by zoom.
  const { names: data, sizePx: basePx } = resolveNameLabels(labels, state);

  return {
    data,
    pickable: true,
    // Medium: regular strokes thin out against dense branches at 12-13 px.
    fontWeight: 500,
    getPosition: (d) => addZOffset(d.position, getHistoryOffset(cached, d)),
    getText: (d) => d.text,
    getSize: (d) => basePx * (layerStyles.getLabelSize(d, cached) / baseStyleSize),
    // A constant screen gap from the tip, so labels do not drift away when zooming.
    getPixelOffset: (d) => d.pixelOffset ?? [0, 0],
    getColor: (d) => layerStyles.getLabelColor(d, cached),
    // Convert rotation from radians to degrees (deck.gl expects degrees)
    getAngle: (d) => ((d.rotation ?? 0) * 180) / Math.PI,
    getTextAnchor: (d) => normalizeTextAnchor(d.textAnchor),
    outlineWidth: 2,
    outlineColor: LABEL_HALO_COLOR,

    updateTriggers: {
      getColor: [colorVersion, taxaColorVersion, highlightColorMode],
      getSize: [fontSize, colorVersion, taxaColorVersion, taxaCount, basePx],
      getPosition: [colorVersion],
    },
  };
}
