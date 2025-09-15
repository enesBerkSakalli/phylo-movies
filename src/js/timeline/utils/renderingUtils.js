import { msToX } from './coordinateUtils.js';
import { createPathLayer } from './layerUtils.js';

export function getDevicePixelRatio() {
  return (typeof window !== 'undefined' && window.devicePixelRatio) ? window.devicePixelRatio : 1;
}

export function createSnapFunction(dpr) {
  return (v) => Math.round(v * dpr) / dpr;
}

export function createScrubberLayer(ms, rangeStart, rangeEnd, width, height, theme, isScrubbing) {
  const dpr = getDevicePixelRatio();
  const snap = createSnapFunction(dpr);
  const scrubX = snap(msToX(ms, rangeStart, rangeEnd, width));
  const scrubPoly = [
    [scrubX - width / 2, -height / 2],
    [scrubX - width / 2, height / 2]
  ];
  const coreRGB = theme.scrubberCoreRGB;
  const coreColor = [coreRGB[0], coreRGB[1], coreRGB[2], 255];
  // Return an object of props for cloning, not a full layer instance
  return {
    id: 'scrubber-layer',
    data: [{ path: scrubPoly }],
    getColor: coreColor,
    widthMinPixels: isScrubbing ? 10 : 7,
    // Add a subtle white outline for better visibility over segments
    getLineColor: [255, 255, 255, 180],
    lineWidthMinPixels: 1
  };
}
