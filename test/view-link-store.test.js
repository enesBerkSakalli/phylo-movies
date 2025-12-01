const { expect } = require('chai');

// SUTs
const { useAppStore } = require('../src/js/core/store.js');
const { buildViewLinkMapping } = require('../src/js/utils/viewLinkMapping.js');

describe('View link store wiring', () => {
  beforeEach(() => {
    // Reset only the fields under test to avoid cross-test leakage.
    useAppStore.setState({
      screenPositionsLeft: {},
      screenPositionsRight: {},
      viewLinkMapping: {},
    }, true);
  });

  it('routes left positions via setScreenPositions', () => {
    const positions = { a: { x: 1, y: 2, width: 3, height: 4 } };
    useAppStore.getState().setScreenPositions('left', positions);

    const { screenPositionsLeft, screenPositionsRight } = useAppStore.getState();
    expect(screenPositionsLeft).to.deep.equal(positions);
    expect(screenPositionsRight).to.deep.equal({});
  });

  it('routes right positions via setScreenPositions', () => {
    const positions = { b: { x: 5, y: 6, width: 7, height: 8 } };
    useAppStore.getState().setScreenPositions('right', positions);

    const { screenPositionsLeft, screenPositionsRight } = useAppStore.getState();
    expect(screenPositionsRight).to.deep.equal(positions);
    expect(screenPositionsLeft).to.deep.equal({});
  });

  it('treats non-right sides as left positions', () => {
    const positions = { c: { x: 9, y: 10, width: 11, height: 12 } };
    useAppStore.getState().setScreenPositions('single', positions);

    const { screenPositionsLeft, screenPositionsRight } = useAppStore.getState();
    expect(screenPositionsLeft).to.deep.equal(positions);
    expect(screenPositionsRight).to.deep.equal({});
  });
});

describe('buildViewLinkMapping', () => {
  it('reshapes source/destination maps into a simple adjacency', () => {
    const pairSolution = {
      solution_to_source_map: {
        '[1,2]': { '[10]': [1, 2] },
      },
      solution_to_destination_map: {
        '[1,2]': { '[10]': [10] },
      },
    };

    const result = buildViewLinkMapping(null, null, null, null, pairSolution);
    expect(result.sourceToDest).to.deep.equal({ '1-2': ['10'] });
    expect(result.destToSource).to.deep.equal({ '10': ['1-2'] });
  });

  it('returns empty mapping when solution maps are missing', () => {
    const result = buildViewLinkMapping(null, null, null, null, null);
    expect(result).to.deep.equal({});
  });
});
