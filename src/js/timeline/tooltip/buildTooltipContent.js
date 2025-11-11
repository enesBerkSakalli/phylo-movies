export function buildTimelineTooltipContent(segment, segIndex, totalSegments, state, getLeafNamesByIndices) {
  const isFull = !!segment.isFullTree;

  const leaves = !isFull && typeof segment?.subtreeMoveCount === 'number' ? segment.subtreeMoveCount : 0;
  const steps = segment.hasInterpolation && Array.isArray(segment.interpolationData)
    ? segment.interpolationData.length : 1;

  let groupedHtml = '';

  let movingSubtreesDisplay = '—';
  if (!isFull && segment.jumpingSubtrees && Array.isArray(segment.jumpingSubtrees)) {
    // Format jumping subtrees: these are leaf indices that are moving
    movingSubtreesDisplay = formatJumpingSubtrees(segment.jumpingSubtrees, getLeafNamesByIndices);
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
    ${isFull ? '' : `<div class="tt-row"><span class="tt-label">Moving subtrees:</span><span class="tt-value">${movingSubtreesDisplay}</span></div>`}
    ${isFull ? '' : `<div class="tt-row"><span class="tt-label">Steps:</span><span class="tt-value">${steps} step${steps!==1?'s':''}</span></div>`}
    ${isFull ? '' : `<div class="tt-row"><span class="tt-label">Taxa moving:</span><span class="tt-value">${leaves}</span></div>`}
    ${groupedHtml}
    <div class="tt-divider"></div>
    <div class="tt-hint">${hint}</div>
  `;
}

/**
 * Formats jumping subtree solutions by converting leaf indices to taxon names.
 * Jumping subtrees are the actual clades being moved during SPR operations.
 *
 * @param {Array} jumpingSubtrees - Array of solutions, each containing groups of leaf indices
 * @param {Function} getLeafNamesByIndices - Function to convert leaf indices to names
 * @returns {string} Formatted string like "[A, B, C], [D, E]" or "—"
 */
function formatJumpingSubtrees(jumpingSubtrees, getLeafNamesByIndices) {
  if (!jumpingSubtrees || !jumpingSubtrees.length || !getLeafNamesByIndices) {
    return '—';
  }

  const subtreeDescriptions = [];

  // jumpingSubtrees structure: [ [ [leaf_indices_group_1], [leaf_indices_group_2] ], ... ]
  for (const solution of jumpingSubtrees) {
    if (!Array.isArray(solution)) continue;

    for (const leafIndicesGroup of solution) {
      if (!Array.isArray(leafIndicesGroup) || leafIndicesGroup.length === 0) continue;

      // Convert leaf indices to taxon names
      const leafNames = getLeafNamesByIndices(leafIndicesGroup);

      if (leafNames && leafNames.length > 0) {
        // Format: show first few names, add ellipsis if too many
        if (leafNames.length === 1) {
          subtreeDescriptions.push(`[${leafNames[0]}]`);
        } else if (leafNames.length <= 3) {
          subtreeDescriptions.push(`[${leafNames.join(', ')}]`);
        } else if (leafNames.length <= 5) {
          subtreeDescriptions.push(`[${leafNames.slice(0, 4).join(', ')}, …]`);
        } else {
          // For larger subtrees, show first 3 + count
          subtreeDescriptions.push(`[${leafNames.slice(0, 3).join(', ')} + ${leafNames.length - 3} more]`);
        }
      }
    }
  }

  return subtreeDescriptions.length > 0 ? subtreeDescriptions.join(', ') : '—';
}
