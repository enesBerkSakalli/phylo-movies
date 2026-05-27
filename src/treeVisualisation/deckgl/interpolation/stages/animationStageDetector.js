/**
 * AnimationStageDetector.js
 * Detects the current animation stage based on element presence between tree states.
 */
import { createLifecycleClocks, summarizeTransitionLifecycles } from '../TransitionChangeModel.js';

export const ANIMATION_STAGES = {
  COLLAPSE: 'COLLAPSE', // Elements exiting (branches disappearing)
  EXPAND: 'EXPAND', // Elements entering (branches appearing)
  REORDER: 'REORDER', // Same elements, different positions
};

/**
 * Detects animation stage by comparing semantic branch lifecycles first, then node IDs.
 * @param {Object} dataFrom - Source tree data with nodes array
 * @param {Object} dataTo - Target tree data with nodes array
 * @param {Object|null} transitionChangeModel - Optional branch lifecycle model
 * @returns {string} One of ANIMATION_STAGES values
 */
export function detectAnimationStage(dataFrom, dataTo, transitionChangeModel = null) {
  const lifecycleSummary = summarizeTransitionLifecycles(transitionChangeModel);
  if (lifecycleSummary.hasCollapseChanges) {
    return ANIMATION_STAGES.COLLAPSE;
  }
  if (lifecycleSummary.hasExpandChanges) {
    return ANIMATION_STAGES.EXPAND;
  }

  if (!dataFrom?.nodes || !dataTo?.nodes) {
    return ANIMATION_STAGES.REORDER;
  }

  const fromIds = new Set(dataFrom.nodes.map((n) => n.id));
  const toIds = new Set(dataTo.nodes.map((n) => n.id));

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

/**
 * Detects the active animation phase for one frame of a transition.
 *
 * `detectAnimationStage` is transition-wide: if a pair contains any collapsing
 * lifecycle it returns COLLAPSE for the whole pair. Playback needs the current
 * lifecycle clock phase so mixed collapse/move/expand transitions can report
 * and ease the active phase instead of the whole transition category.
 */
export function detectCurrentAnimationStage(
  dataFrom,
  dataTo,
  transitionChangeModel = null,
  timeFactor = null
) {
  const lifecycleSummary =
    transitionChangeModel?.lifecycleSummary ?? summarizeTransitionLifecycles(transitionChangeModel);

  if (lifecycleSummary.hasStructuralChanges && Number.isFinite(timeFactor)) {
    const clocks = createLifecycleClocks(timeFactor);
    if (lifecycleSummary.hasCollapseChanges && isClockActive(clocks.collapseT)) {
      return ANIMATION_STAGES.COLLAPSE;
    }
    if (lifecycleSummary.hasExpandChanges && isClockActive(clocks.expandT)) {
      return ANIMATION_STAGES.EXPAND;
    }
    return ANIMATION_STAGES.REORDER;
  }

  return detectAnimationStage(dataFrom, dataTo, transitionChangeModel);
}

function isClockActive(value) {
  return Number.isFinite(value) && value > 0 && value < 1;
}
