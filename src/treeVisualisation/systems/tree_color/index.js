/**
 * Color utilities barrel export
 */
export { getBaseBranchColor, getBaseNodeColor } from './monophyleticColoring.js';

export {
  toSplitSet,
  isLinkPivotEdge,
  nodeOrParentMatchesPivotEdge,
  nodeOrParentMatchesAnyEdge,
  isLinkDownstreamOfChangeEdge,
  isNodeDownstreamOfChangeEdge,
} from './changeEdgeDetection.js';
