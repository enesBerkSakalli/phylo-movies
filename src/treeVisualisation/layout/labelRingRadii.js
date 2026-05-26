import { calculateTaxaVisualScale } from '../utils/visualScale.js';

const TAU = Math.PI * 2;
const DENSE_LABEL_THRESHOLD = 50;
const LABEL_FONT_SIZE_UNIT = 12;
const DEFAULT_LABEL_SIZE = 24;
const LABEL_TANGENTIAL_SPACING_FACTOR = 1.15;
const MIN_ANGLE_SPAN_RADIANS = Math.PI / 6;

function finiteNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizeAngle(angle) {
  const normalized = angle % TAU;
  return normalized < 0 ? normalized + TAU : normalized;
}

function normalizeAngleSpan(angleSpanRadians) {
  const span = Number(angleSpanRadians);
  if (!Number.isFinite(span) || span <= 0) return TAU;
  return Math.max(MIN_ANGLE_SPAN_RADIANS, Math.min(TAU, span));
}

export function estimateLabelSize(fontSize, labelCount) {
  const numericFontSize = typeof fontSize === 'string' ? parseFloat(fontSize) : Number(fontSize);
  const baseSize = (numericFontSize * LABEL_FONT_SIZE_UNIT) || DEFAULT_LABEL_SIZE;
  return baseSize * calculateTaxaVisualScale(labelCount);
}

export function calculateLabelAngleSpan(labels) {
  if (!Array.isArray(labels) || labels.length < 2) return TAU;

  const angles = labels
    .map((label) => Number(label?.angle))
    .filter(Number.isFinite)
    .map(normalizeAngle)
    .sort((a, b) => a - b);

  if (angles.length < 2) return TAU;

  let largestGap = 0;
  for (let i = 1; i < angles.length; i += 1) {
    largestGap = Math.max(largestGap, angles[i] - angles[i - 1]);
  }
  largestGap = Math.max(largestGap, angles[0] + TAU - angles[angles.length - 1]);

  return normalizeAngleSpan(TAU - largestGap);
}

export function calculateReadableLabelRadius({
  labelCount,
  fontSize,
  angleSpanRadians = TAU,
  spacingFactor = LABEL_TANGENTIAL_SPACING_FACTOR
} = {}) {
  const count = Number(labelCount);
  if (!Number.isFinite(count) || count <= DENSE_LABEL_THRESHOLD) return null;

  const labelSize = estimateLabelSize(fontSize, count);
  const span = normalizeAngleSpan(angleSpanRadians);
  return (count * labelSize * spacingFactor) / span;
}

export function calculateReadableLabelRadii({
  baseRadius,
  labelOffsets,
  labelCount,
  fontSize,
  angleSpanRadians
} = {}) {
  const base = Math.max(0, finiteNumber(baseRadius, 0));
  const extensionOffset = finiteNumber(labelOffsets?.EXTENSION, 5);
  const labelOffset = finiteNumber(labelOffsets?.DEFAULT, 20);
  const compactExtensionRadius = base + extensionOffset;
  const compactLabelRadius = compactExtensionRadius + labelOffset;
  const readableLabelRadius = calculateReadableLabelRadius({
    labelCount,
    fontSize,
    angleSpanRadians
  });
  const labelRadius = Math.max(compactLabelRadius, readableLabelRadius ?? compactLabelRadius);
  const extensionRadius = Math.max(compactExtensionRadius, labelRadius - labelOffset);

  return {
    extensionRadius,
    labelRadius
  };
}
