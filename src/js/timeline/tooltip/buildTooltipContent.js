export function buildTimelineTooltipContent(segment, segIndex, totalSegments, state, getLeafNamesByIndices) {
  const isFull = !!segment.isFullTree;

  const leaves = !isFull && typeof segment?.subtreeMoveCount === 'number' ? segment.subtreeMoveCount : 0;
  const steps = segment.hasInterpolation && Array.isArray(segment.interpolationData)
    ? segment.interpolationData.length : 1;

  let groupedHtml = '';

  let activeChangingSplits = null;
  if (!isFull) {
    // Get active changing splits from split_change_tracking for any tree in this segment
    if (Array.isArray(segment.interpolationData)) {
      for (const it of segment.interpolationData) {
        const treeIndex = it?.originalIndex;
        if (typeof treeIndex === 'number' && state.activeChangeEdgeTracking?.[treeIndex]) {
          activeChangingSplits = state.activeChangeEdgeTracking[treeIndex];
          break;
        }
      }
    }
  }

  const hint = isFull
    ? 'Anchor (non‑scrubbable) — Click to jump • ←/→ to step'
    : 'Drag to scrub • Click segment to jump';

  return `
    <div class="tt-header">
      <span class="material-icons">${isFull ? 'anchor' : 'timeline'}</span>
      <span>${isFull ? 'Anchor Point — Stable Tree' : 'Transition Segment'}</span>
    </div>
    <div class="tt-divider"></div>
    <div class="tt-row"><span class="tt-label">Segment:</span><span class="tt-value">${segIndex + 1} / ${totalSegments}</span></div>
    ${isFull ? '' : `<div class="tt-row"><span class="tt-label">Active splits:</span><span class="tt-value">${activeChangingSplits ? `[${activeChangingSplits.join(', ')}]` : '—'}</span></div>`}
    ${isFull ? '' : `<div class="tt-row"><span class="tt-label">Steps:</span><span class="tt-value">${steps} step${steps!==1?'s':''}</span></div>`}
    ${isFull ? '' : `<div class="tt-row"><span class="tt-label">Subtree changes:</span><span class="tt-value">${leaves}</span></div>`}
    ${groupedHtml}
    <div class="tt-divider"></div>
    <div class="tt-hint">${hint}</div>
  `;
}
