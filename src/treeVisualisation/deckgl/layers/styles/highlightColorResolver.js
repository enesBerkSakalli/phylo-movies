import { SYSTEM_TREE_COLORS } from '../../../../constants/TreeColors.js';
import { colorToRgb, getContrastingHighlightColor } from '../../../../services/ui/colorUtils.js';

export function resolveSubtreeHighlightRgb({
  baseColor,
  mode = 'solid',
  subtreeHighlightColor = SYSTEM_TREE_COLORS.subtreeHighlightColor,
}) {
  const baseRgb = colorToRgb(baseColor || SYSTEM_TREE_COLORS.defaultColor);

  if (mode === 'taxa') {
    return baseRgb;
  }

  if (mode === 'contrast') {
    return getContrastingHighlightColor(baseRgb);
  }

  return colorToRgb(subtreeHighlightColor || SYSTEM_TREE_COLORS.subtreeHighlightColor);
}
