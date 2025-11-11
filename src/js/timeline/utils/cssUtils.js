export function getCssVarColor(element, varName) {
  try {
    const el = element || document.documentElement;
    const style = window.getComputedStyle(el);
    const value = style.getPropertyValue(varName).trim();
    if (!value) return null;
    return parseCssColor(value);
  } catch { return null; }
}

export function getCssVarNumber(element, varName, defVal) {
  try {
    const el = element || document.documentElement;
    const style = window.getComputedStyle(el);
    const value = parseFloat(style.getPropertyValue(varName));
    return Number.isFinite(value) ? value : defVal;
  } catch { return defVal; }
}

export function parseCssColor(str) {
  if (!str) return null;

  // Handle rgb/rgba formats
  const rgbaMatch = str.match(/rgba?\(([^)]+)\)/i);
  if (rgbaMatch) {
    // Handle both space-separated (rgb(209 209 216)) and comma-separated (rgb(209, 209, 216)) formats
    const content = rgbaMatch[1].trim();
    const parts = content.includes(',')
      ? content.split(',').map(s => s.trim())
      : content.split(/\s+/);
    const r = parseInt(parts[0], 10) || 0;
    const g = parseInt(parts[1], 10) || 0;
    const b = parseInt(parts[2], 10) || 0;
    return [r, g, b];
  }

  // Handle hex format
  const hexMatch = str.match(/^#([0-9a-f]{6})$/i);
  if (hexMatch) {
    const hex = hexMatch[1];
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return [r, g, b];
  }

  // Handle oklch, lab, lch, and other modern CSS color formats
  // by using canvas to convert to RGB
  if (str.match(/^(oklch|oklab|lab|lch|hwb|color)\(/i)) {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = str;
      ctx.fillRect(0, 0, 1, 1);
      const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
      return [r, g, b];
    } catch {
      return null;
    }
  }

  return null;
}

export function getTimelineTheme(container) {
  return {
    // Connection properties
    connectionWidth: getCssVarNumber(container, '--timeline-connection-width', 4),
    connectionHoverWidth: getCssVarNumber(container, '--timeline-connection-hover-width', 5),
    connectionSelectionWidth: getCssVarNumber(container, '--timeline-connection-selection-width', 6),
    connectionSelectionRGB: getCssVarColor(container, '--timeline-connection-selection-color') || [64, 128, 255],
    connectionHoverRGB: getCssVarColor(container, '--timeline-connection-hover-color') || [64, 128, 255],
    connectionNeutralRGB: getCssVarColor(container, '--timeline-connection-color-neutral') || [160, 160, 160],

    // Anchor properties
    anchorStrokeWidth: getCssVarNumber(container, '--timeline-anchor-stroke-width', 3),
    anchorFillRGB: getCssVarColor(container, '--timeline-anchor-fill-color') || [60, 60, 80],
    anchorStrokeRGB: getCssVarColor(container, '--timeline-anchor-stroke-color') || [255, 255, 255],
    anchorRadiusVar: getCssVarNumber(container, '--timeline-anchor-radius', NaN),

    // Separator properties
    separatorRGB: getCssVarColor(container, '--timeline-separator-color') || [190, 195, 210],
    separatorWidth: getCssVarNumber(container, '--timeline-separator-width', 2),

    // Scrubber properties
    scrubberCoreRGB: getCssVarColor(container, '--timeline-scrubber-core-color') || [255, 255, 255],

    // Layout properties
    gapDefault: getCssVarNumber(container, '--timeline-gap-default', 6),
    paddingX: getCssVarNumber(container, '--timeline-padding-x', 0),
    paddingY: getCssVarNumber(container, '--timeline-padding-y', 0)
  };
}
