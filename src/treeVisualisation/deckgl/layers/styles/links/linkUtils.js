import { colorToRgb, themeColor } from '../../../../../services/ui/colorUtils.js';
import { SYSTEM_TREE_COLORS } from '../../../../../constants/TreeColors.js';
import { resolveSubtreeHighlightRgb } from '../../../colors/highlightColorResolver.js';

// The theme's --expand and --collapse, read at boot; the literals are those tokens' values.
export const EXPANDING_LIFECYCLE_COLOR = themeColor('--expand', [34, 197, 94]);
export const COLLAPSING_LIFECYCLE_COLOR = themeColor('--collapse', [245, 158, 11]);

export const getLifecycleLinkHighlight = (link) => {
  switch (link?.lifecycle) {
    case 'entering':
    case 'reviving':
      return {
        kind: 'expanding',
        rgb: EXPANDING_LIFECYCLE_COLOR,
      };
    case 'exiting':
    case 'zeroing':
      return {
        kind: 'collapsing',
        rgb: COLLAPSING_LIFECYCLE_COLOR,
      };
    default:
      return null;
  }
};

export const hasLifecycleHighlightedLinks = (links) =>
  Array.isArray(links) && links.some((link) => getLifecycleLinkHighlight(link) !== null);

export const getSubtreeHighlightRgb = (link, cm, mode = 'solid', subtreeHighlightColor) => {
  return resolveSubtreeHighlightRgb({
    baseColor: cm?.getBranchColor(link),
    mode,
    subtreeHighlightColor,
  });
};

export const getInnerLinkColor = (link, cached) => {
  const { colorManager: cm } = cached;
  // TreeColorManager owns base taxa/monophyletic color plus pivot-edge precedence.
  // It is absent until the controller attaches one, so fall back like the width/outline accessors.
  return colorToRgb(cm?.getBranchColorForInnerLine(link) ?? SYSTEM_TREE_COLORS.defaultColor);
};
