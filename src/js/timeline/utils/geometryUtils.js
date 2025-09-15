export function calculateRadius(anchorRadiusVar, height, zoomScale, radiusStrategy = null) {
  if (radiusStrategy && typeof radiusStrategy.getRadius === 'function') {
    return radiusStrategy.getRadius(anchorRadiusVar, height, zoomScale);
  }
  const baseRadius = Number.isFinite(anchorRadiusVar)
    ? anchorRadiusVar
    : Math.max(3, Math.min(6, Math.floor(height * 0.18)));
  const maxRadius = Math.floor(height * 0.25);
  const minRadius = 1;
  return Math.max(minRadius, Math.min(maxRadius, baseRadius * zoomScale));
}

export function createAnchor(id, x0, x1, width, height, anchorFillRGB, anchorStrokeRGB, anchorRadiusVar, zoomScale, snap, { radiusStrategy } = {}) {
  const center = (x0 + x1) / 2;
  const radius = calculateRadius(anchorRadiusVar, height, zoomScale, radiusStrategy);
  
  // Convert from canvas coordinates [0, width] to centered coordinates [-width/2, width/2]
  // then clamp to ensure circles don't get clipped at edges
  const centeredX = center - width / 2;
  const minX = -width / 2 + radius;
  const maxX = width / 2 - radius;
  const clampedX = Math.max(minX, Math.min(maxX, centeredX));
  const pos = [snap(clampedX), 0];
  
  const fillColor = [anchorFillRGB[0], anchorFillRGB[1], anchorFillRGB[2], 255];
  const borderColor = [anchorStrokeRGB[0], anchorStrokeRGB[1], anchorStrokeRGB[2], 255];
  return { id, position: pos, fillColor, borderColor, radius };
}

export function createConnection(i, id, x0, x1, width, height, anchorRadiusVar, zoomScale, gapDefault, connectionNeutralRGB, snap, segments, { radiusStrategy, gapStrategy } = {}) {
  const anchorRadius = calculateRadius(anchorRadiusVar, height, zoomScale, radiusStrategy);
  let leftGap, rightGap;
  if (gapStrategy && typeof gapStrategy.getGaps === 'function') {
    const g = gapStrategy.getGaps({ index: i, segments, anchorRadius, gapDefault });
    leftGap = g.leftGap; rightGap = g.rightGap;
  } else {
    const anchorGap = anchorRadius;
    const defaultGap = gapDefault;
    const leftNeighborIsAnchor = (i > 0) && !!segments[i - 1]?.isFullTree;
    const rightNeighborIsAnchor = (i < segments.length - 1) && !!segments[i + 1]?.isFullTree;
    leftGap = leftNeighborIsAnchor ? anchorGap : defaultGap;
    rightGap = rightNeighborIsAnchor ? anchorGap : defaultGap;
  }
  const xStart = snap((x0 - width / 2) + leftGap);
  const xEnd = snap((x1 - width / 2) - rightGap);
  if (xEnd <= xStart) return null;
  const path = [[xStart, 0], [xEnd, 0]];
  const color = [connectionNeutralRGB[0], connectionNeutralRGB[1], connectionNeutralRGB[2], 220];
  return { id, path, color };
}
