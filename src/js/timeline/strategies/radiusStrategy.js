// Radius strategy interface: { getRadius(anchorRadiusVar, height, zoomScale) }

export const DefaultRadiusStrategy = {
  getRadius(anchorRadiusVar, height, zoomScale) {
    const baseRadius = Number.isFinite(anchorRadiusVar)
      ? anchorRadiusVar
      : Math.max(3, Math.min(6, Math.floor(height * 0.18)));
    const maxRadius = Math.floor(height * 0.25);
    const minRadius = 1;
    return Math.max(minRadius, Math.min(maxRadius, baseRadius * zoomScale));
  }
};

