/**
 * Build HTML for the timeline tooltip.
 * - No phase text
 * - Shows segment type, index, steps (if transition), moving count, and taxa list
 * - When grouping is configured (TaxaColoring), lists taxa grouped accordingly
 *
 * @param {Object} segment - Timeline segment
 * @param {number} segIndex - 0-based segment index
 * @param {number} totalSegments - total number of segments
 * @param {Object} state - app store state
 * @param {(indices:number[])=>string[]} getLeafNamesByIndices - resolver for activeChangeEdge indices
 * @returns {string} HTML content
 */
export function buildTimelineTooltipContent(segment, segIndex, totalSegments, state, getLeafNamesByIndices) {
  const isFull = !!segment.isFullTree;

  // Use precomputed subtreeMoveCount from split_change_events
  const leaves = !isFull && typeof segment?.subtreeMoveCount === 'number' ? segment.subtreeMoveCount : 0;
  const steps = segment.hasInterpolation && Array.isArray(segment.interpolationData)
    ? segment.interpolationData.length : 1;

  // No taxa list for subtrees; show count only
  let groupedHtml = '';

  // Extract s_edge id if available (prefer explicit tracker, else parse from tree_pair_key)
  let sEdgeId = null;
  if (!isFull) {
    // Look across interpolationData for a numeric s_edge_tracker
    if (Array.isArray(segment.interpolationData)) {
      for (const it of segment.interpolationData) {
        const sid = it?.metadata?.s_edge_tracker;
        if (Number.isInteger(sid)) { sEdgeId = sid; break; }
      }
    }
    if (sEdgeId === null) {
      const key = segment?.metadata?.tree_pair_key;
      if (typeof key === 'string') {
        const m = key.match(/pair_(\d+)_/);
        if (m) sEdgeId = parseInt(m[1], 10);
      }
    }
  }

  return `
    <div class="tt-header">
      <span class="material-icons">${isFull ? 'anchor' : 'timeline'}</span>
      <span>${isFull ? 'Anchor Point — Stable Tree' : 'Transition Segment'}</span>
    </div>
    <div class="tt-divider"></div>
    <div class="tt-row"><span class="tt-label">Segment:</span><span class="tt-value">${segIndex + 1} / ${totalSegments}</span></div>
    ${isFull ? '' : `<div class="tt-row"><span class="tt-label">S-edge:</span><span class="tt-value">${sEdgeId !== null ? sEdgeId : '—'}</span></div>`}
    ${isFull ? '' : `<div class="tt-row"><span class="tt-label">Steps:</span><span class="tt-value">${steps} step${steps!==1?'s':''}</span></div>`}
    ${isFull ? '' : `<div class="tt-row"><span class="tt-label">Subtrees:</span><span class="tt-value">${leaves}</span></div>`}
    ${groupedHtml}
    <div class="tt-divider"></div>
    <div class="tt-hint">Click segment to jump • Drag scrubber to scrub</div>
  `;
}
