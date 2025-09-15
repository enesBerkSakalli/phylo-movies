// Gap strategy interface: { getGaps({index, segments, anchorRadius, gapDefault}) -> {leftGap, rightGap} }

export const DefaultGapStrategy = {
  getGaps({ index, segments, anchorRadius, gapDefault }) {
    const leftNeighborIsAnchor = (index > 0) && !!segments[index - 1]?.isFullTree;
    const rightNeighborIsAnchor = (index < segments.length - 1) && !!segments[index + 1]?.isFullTree;
    const anchorGap = anchorRadius;
    const leftGap = leftNeighborIsAnchor ? anchorGap : gapDefault;
    const rightGap = rightNeighborIsAnchor ? anchorGap : gapDefault;
    return { leftGap, rightGap };
  }
};

