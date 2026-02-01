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
  isLinkActiveChangeEdge,
  isNodeActiveChangeEdge,
  nodeOrParentMatchesActiveEdge,
  nodeOrParentMatchesAnyEdge,
  isLinkDownstreamOfChangeEdge,
  isNodeDownstreamOfChangeEdge
} from './changeEdgeDetection.js';
