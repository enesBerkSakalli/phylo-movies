import { colorToRgb, getContrastingHighlightColor } from '../../../../../services/ui/colorUtils.js';
import { SYSTEM_TREE_COLORS } from '../../../../../constants/TreeColors.js';

const EXPANDING_LIFECYCLE_COLOR = [34, 197, 94];
const COLLAPSING_LIFECYCLE_COLOR = [245, 158, 11];

export const getLifecycleLinkHighlight = (link) => {
  switch (link?.lifecycle) {
    case 'entering':
    case 'reviving':
      return {
        kind: 'expanding',
        rgb: EXPANDING_LIFECYCLE_COLOR
      };
    case 'exiting':
    case 'zeroing':
      return {
        kind: 'collapsing',
        rgb: COLLAPSING_LIFECYCLE_COLOR
      };
    default:
      return null;
  }
};

export const hasLifecycleHighlightedLinks = (links) =>
  Array.isArray(links) && links.some((link) => getLifecycleLinkHighlight(link) !== null);

export const getSubtreeHighlightRgb = (link, cm, mode = 'solid', subtreeHighlightColor) => {
  if (mode === 'contrast') {
    const baseRgb = colorToRgb(cm.getBranchColor(link));
    return getContrastingHighlightColor(baseRgb);
  } else if (mode === 'taxa') {
    return colorToRgb(cm.getBranchColor(link));
  } else {
    // 'solid' mode - default subtree highlight color
    return colorToRgb(subtreeHighlightColor || SYSTEM_TREE_COLORS.subtreeHighlightColor);
  }
};

export const getInnerLinkColor = (link, cached) => {
  const { colorManager: cm } = cached;
  // This already includes precedence logic from TreeColorManager.
  return colorToRgb(cm.getBranchColorForInnerLine(link));
};
