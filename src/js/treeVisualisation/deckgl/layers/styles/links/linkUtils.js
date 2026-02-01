import { isLinkInSubtree } from '../../../../utils/splitMatching.js';
import { colorToRgb, getContrastingHighlightColor } from '../../../../../services/ui/colorUtils.js';
import { TREE_COLOR_CATEGORIES } from '../../../../../constants/TreeColors.js';

export const getMarkedHighlightColor = (link, cm, mode = 'solid', markedColor) => {
  if (mode === 'contrast') {
    const baseRgb = colorToRgb(cm.getBranchColor(link));
    return getContrastingHighlightColor(baseRgb);
  } else if (mode === 'taxa') {
    return colorToRgb(cm.getBranchColor(link));
  } else {
    // 'solid' mode - default Red
    return colorToRgb(markedColor || TREE_COLOR_CATEGORIES.markedColor);
  }
};

export const shouldHighlightMarkedSubtree = (link, cached) => {
  const { markedSubtreesEnabled, highlightSourceEnabled, highlightDestinationEnabled, markedSubtreeData, colorManager } = cached;

  // Specific toggles override specific subset checks
  if (highlightSourceEnabled && colorManager?.isLinkSourceEdge?.(link)) return true;
  if (highlightDestinationEnabled && colorManager?.isLinkDestinationEdge?.(link)) return true;

  return markedSubtreesEnabled !== false && markedSubtreeData && isLinkInSubtree(link, markedSubtreeData);
};

export const shouldHighlightHistorySubtree = (link, cached) => {
  // History layer deactivated
  return false;
  // const { colorManager: cm, markedSubtreesEnabled } = cached;
  // return markedSubtreesEnabled !== false && cm?.isLinkHistorySubtree?.(link);
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

