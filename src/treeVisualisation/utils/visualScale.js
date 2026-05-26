const DENSE_LABEL_REFERENCE_TAXA = 50;
const DENSE_LABEL_SCALE_EXPONENT = 0.6;
const MIN_DENSE_LABEL_VISUAL_SCALE = 0.3;

export function calculateTaxaVisualScale(taxaCount) {
  const count = Number(taxaCount);
  if (!Number.isFinite(count) || count <= DENSE_LABEL_REFERENCE_TAXA) return 1;

  const densityScale = Math.pow(DENSE_LABEL_REFERENCE_TAXA / count, DENSE_LABEL_SCALE_EXPONENT);
  return Math.max(MIN_DENSE_LABEL_VISUAL_SCALE, Math.min(1.0, densityScale));
}
