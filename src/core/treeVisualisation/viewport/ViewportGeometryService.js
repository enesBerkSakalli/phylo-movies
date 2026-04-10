export function calculateLayoutOptions(width, height, storeState, maxGlobalScale) {
  if (!width || !height) {
    width = 800;
    height = 600;
  }

  const { branchTransformation, layoutAngleDegrees, layoutRotationDegrees, styleConfig } = storeState;
  const offsets = styleConfig?.labelOffsets || { DEFAULT: 20, EXTENSION: 5 };

  const containerWidth = width - 120; // 60 margin * 2
  const containerHeight = height - 120;
  const maxLeafRadius = Math.min(containerWidth, containerHeight) / 2;
  const extensionRadius = maxLeafRadius + (offsets.EXTENSION ?? 5);
  const labelRadius = extensionRadius + (offsets.DEFAULT ?? 20);

  return {
    width,
    height,
    margin: 60,
    branchTransformation,
    layoutAngleDegrees,
    layoutRotationDegrees,
    extensionRadius,
    labelRadius,
    maxGlobalScale
  };
}

export function calculateMetricScale(rFrom = 300, rTo = 300, t, width = 800, height = 600) {
  const currentMaxRadius = rFrom + (rTo - rFrom) * t;

  // Ideal radius is roughly half the screen dimension (e.g. 300-400px)
  const idealRadius = Math.min(width, height) / 2.5;

  // Pass scale to layers (clamped to 1.0 max, and 0.05 min to prevent invisibility)
  return Math.max(0.05, Math.min(1.0, currentMaxRadius / idealRadius));
}
