import { colorToRgb } from '../../../../services/ui/colorUtils.js';
import { SYSTEM_TREE_COLORS } from '../../../../constants/TreeColors.js';
import { resolveSubtreeHighlightRgb } from '../../colors/highlightColorResolver.js';

/**
 * Compute RGBA color for a connector based on movement state and colorManager.
 */
export function computeConnectionColor(
  colorEntry,
  isMoving,
  colorManager,
  subtreeHighlightsEnabled,
  linkConnectionOpacity,
  highlightColorMode = 'solid',
  subtreeHighlightColor = SYSTEM_TREE_COLORS.subtreeHighlightColor
) {
  const fallbackHex = SYSTEM_TREE_COLORS.pivotEdgeColor;
  const baseColorHex = colorManager?.getNodeBaseColor?.(colorEntry);
  let rgb;

  if (isMoving && subtreeHighlightsEnabled) {
    rgb = resolveSubtreeHighlightRgb({
      baseColor: baseColorHex || fallbackHex,
      mode: highlightColorMode,
      subtreeHighlightColor,
    });
  } else {
    rgb = colorToRgb(baseColorHex || fallbackHex);
  }

  const alpha = isMoving ? 255 : Math.round(linkConnectionOpacity * 255);
  return [rgb[0], rgb[1], rgb[2], alpha];
}
