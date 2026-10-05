const { expect } = require('chai');

const {
  getSegmentBounds,
  timeToSegmentIndex,
} = require('../../../src/timeline/utils/segmentTiming.js');

describe('segmentTiming utilities', () => {
  const timelineData = {
    cumulativeDurations: [500, 1500, 1500, 3000],
    totalDuration: 3000,
  };

  it('resolves segment bounds from cumulative timing data', () => {
    expect(getSegmentBounds(0, timelineData)).to.deep.equal({ start: 0, end: 500, duration: 500 });
    expect(getSegmentBounds(1, timelineData)).to.deep.equal({
      start: 500,
      end: 1500,
      duration: 1000,
    });
    expect(getSegmentBounds(2, timelineData)).to.deep.equal({
      start: 1500,
      end: 1500,
      duration: 0,
    });
    expect(getSegmentBounds(9, timelineData)).to.equal(null);
  });

  it('keeps boundary lookup compatible with existing timeline behavior', () => {
    expect(timeToSegmentIndex(0, timelineData)).to.equal(0);
    expect(timeToSegmentIndex(500, timelineData)).to.equal(2);
    expect(timeToSegmentIndex(1500, timelineData)).to.equal(3);
    expect(timeToSegmentIndex(3000, timelineData)).to.equal(-1);
  });
});
