import { isLinkInSubtree } from '../../../../../domain/tree/splits.js';
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

export const getMarkedHighlightColor = (link, cm, mode = 'solid', markedColor) => {
  if (mode === 'contrast') {
    const baseRgb = colorToRgb(cm.getBranchColor(link));
    return getContrastingHighlightColor(baseRgb);
  } else if (mode === 'taxa') {
    return colorToRgb(cm.getBranchColor(link));
  } else {
    // 'solid' mode - default Red
    return colorToRgb(markedColor || SYSTEM_TREE_COLORS.markedColor);
  }
};

export const shouldHighlightLink = (link, cached) => {
  const { markedSubtreesEnabled, markedSubtreeData } = cached;

  return markedSubtreesEnabled !== false && markedSubtreeData && isLinkInSubtree(link, markedSubtreeData);
};

export const getHistoryOutlineStyle = (link, cm, upcomingChangesEnabled, baseOpacity, historyColor) => {
  if (!upcomingChangesEnabled) return null;

  // Done: strong static glow (same intensity as current)
  if (cm?.isCompletedChangeEdge?.(link)) {
    return {
      rgb: historyColor,
      glowOpacity: Math.round(baseOpacity * 180) // Strong glow
    };
  }

  // Next: medium static glow
  if (cm?.isUpcomingChangeEdge?.(link)) {
    return {
      rgb: historyColor,
      glowOpacity: Math.round(baseOpacity * 120) // Medium glow
    };
  }

  return null;
};

export const getInnerLinkColor = (link, cached) => {
  const { colorManager: cm } = cached;
  // This already includes precedence logic: Marked (Red) > Active (Blue) > Base
  return colorToRgb(cm.getBranchColorForInnerLine(link));
};
