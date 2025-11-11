const { expect } = require('chai');
const Module = require('module');
// Mock deck.gl to avoid ESM/WebGL in tests
const mockDeckGLCore = {
  Deck: class {},
  OrthographicView: class {},
  COORDINATE_SYSTEM: { CARTESIAN: 1 }
};
class MockLayer { constructor(props){ this.props = props || {}; } }
const mockDeckGLLayers = {
  PathLayer: class PathLayer extends MockLayer {},
  ScatterplotLayer: class ScatterplotLayer extends MockLayer {}
};
const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === '@deck.gl/core') return mockDeckGLCore;
  if (request === '@deck.gl/layers') return mockDeckGLLayers;
  return originalLoad.apply(this, arguments);
};

const { processSegments } = require('../src/js/timeline/segmentProcessor.js');

describe('Timeline anchor rendering – duplicate anchors at same time', () => {
  it('offsets consecutive anchors at identical ms so both are visible', () => {
    // Construct a minimal timeline with two consecutive anchors at the same ms
    // Segment 0: anchor (ms=0)
    // Segment 1: interpolation (ms=0..1000)
    // Segment 2: anchor (ms=1000)
    // Segment 3: anchor (ms=1000) -> duplicates with segment 2
    const segments = [
      { isFullTree: true, hasInterpolation: false, interpolationData: [{ originalIndex: 0 }] },
      { isFullTree: false, hasInterpolation: true, interpolationData: new Array(2).fill({}) },
      { isFullTree: true, hasInterpolation: false, interpolationData: [{ originalIndex: 2 }] },
      { isFullTree: true, hasInterpolation: false, interpolationData: [{ originalIndex: 3 }] }
    ];

    const segmentDurations = [0, 1000, 0, 0];
    const cumulativeDurations = [0, 1000, 1000, 1000];
    const timelineData = { totalDuration: 1000, segmentDurations, cumulativeDurations };

    const width = 200;
    const height = 40;
    const theme = {
      anchorFillRGB: [240, 240, 245],
      anchorStrokeRGB: [60, 60, 80],
      anchorRadiusVar: 7,
      gapDefault: 6,
      connectionNeutralRGB: [100, 100, 100],
      separatorRGB: [0, 0, 0],
      separatorWidth: 5,
      connectionWidth: 4,
      connectionHoverRGB: [128, 128, 128],
      connectionHoverWidth: 6,
      connectionSelectionRGB: [64, 128, 255],
      connectionSelectionWidth: 8,
      anchorStrokeWidth: 3,
      scrubberCoreRGB: [0, 122, 255]
    };

    const { anchorPoints } = processSegments(
      {
        startIdx: 0,
        endIdx: 3,
        width,
        height,
        visStart: -100, // generous visual bounds
        visEnd: 1100,
        zoomScale: 1,
        theme,
        timelineData,
        segments,
        selectedId: null,
        lastHoverId: null,
        rangeStart: 0,
        rangeEnd: 1000
      },
      { radiusStrategy: null, gapStrategy: null }
    );

    // Expect three anchors total
    expect(anchorPoints.length).to.equal(3);

    // The last two anchors share the same ms; ensure they do not overlap
    const p2 = anchorPoints[1].position[0];
    const p3 = anchorPoints[2].position[0];
    expect(Math.abs(p3 - p2)).to.be.greaterThan(0);
  });
});
