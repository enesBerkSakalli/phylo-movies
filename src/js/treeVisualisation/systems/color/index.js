/**
 * Color utilities barrel export
 */
export {
  getSubtreeLeaves,
  checkMonophyletic,
  getBaseBranchColor,
  getBaseNodeColor
} from './monophyleticColoring.js';

export {
  splitsEqual,
  resolveActiveEdgeSet,
  isActiveChangeEdgeHighlighted,
  isNodeActiveChangeEdge,
  nodeOrParentMatchesActiveEdge,
  isDownstreamOfActiveChangeEdge,
  isNodeDownstreamOfActiveChangeEdge,
  isComponentMarked,
  isNodeMarked
} from './highlightDetection.js';
