import { colorToRgb } from '../../../../../services/ui/colorUtils.js';
import { resolveSubtreeHighlightRgb } from '../highlightColorResolver.js';

export const EXPANDING_LIFECYCLE_COLOR = [34, 197, 94];
export const COLLAPSING_LIFECYCLE_COLOR = [245, 158, 11];

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
    baseColor: cm.getBranchColor(link),
    mode,
    subtreeHighlightColor,
  });
};

export const getInnerLinkColor = (link, cached) => {
  const { colorManager: cm } = cached;
  // TreeColorManager owns base taxa/monophyletic color plus pivot-edge precedence.
  return colorToRgb(cm.getBranchColorForInnerLine(link));
};
