/**
 * AnimationStageDetector.js
 * Detects the current animation stage based on element presence between tree states.
 */

export const ANIMATION_STAGES = {
  COLLAPSE: 'COLLAPSE',  // Elements exiting (branches disappearing)
  EXPAND: 'EXPAND',      // Elements entering (branches appearing)
  REORDER: 'REORDER'     // Same elements, different positions
};

/**
 * Detects animation stage by comparing node IDs between source and target data.
 * @param {Object} dataFrom - Source tree data with nodes array
 * @param {Object} dataTo - Target tree data with nodes array
 * @returns {string} One of ANIMATION_STAGES values
 */
export function detectAnimationStage(dataFrom, dataTo) {
  if (!dataFrom?.nodes || !dataTo?.nodes) {
    return ANIMATION_STAGES.REORDER;
  }

  const fromIds = new Set(dataFrom.nodes.map(n => n.id));
  const toIds = new Set(dataTo.nodes.map(n => n.id));

  // Count exiting (in from but not in to) and entering (in to but not in from)
  let exiting = 0;
  let entering = 0;

  for (const id of fromIds) {
    if (!toIds.has(id)) exiting++;
  }
  for (const id of toIds) {
    if (!fromIds.has(id)) entering++;
  }

  // Priority: COLLAPSE > EXPAND > REORDER
  // If nodes are exiting, we're in collapse phase
  if (exiting > 0) return ANIMATION_STAGES.COLLAPSE;
  // If nodes are entering (and none exiting), we're in expand phase
  if (entering > 0) return ANIMATION_STAGES.EXPAND;
  // Same nodes, just reordering
  return ANIMATION_STAGES.REORDER;
}
