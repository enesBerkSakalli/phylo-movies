// @vitest-environment jsdom
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const storeState = vi.hoisted(() => ({ current: {} }));

vi.mock('../../../src/state/phyloStore/store.js', () => ({
  selectClearMsaRegion: (state) => state.clearMsaRegion,
  selectHasMsa: (state) => state.hasMsa,
  selectMsaPreviousRegion: (state) => state.msaPreviousRegion,
  selectMsaRegion: (state) => state.msaRegion,
  selectMsaRowOrder: (state) => state.msaRowOrder,
  selectMsaSequences: (state) => state.msaSequences,
  selectSetMsaRegion: (state) => state.setMsaRegion,
  selectTaxaColorVersion: (state) => state.taxaColorVersion,
  selectTaxaGrouping: (state) => state.taxaGrouping,
  useAppStore: (selector) => selector(storeState.current),
}));

describe('MSA context row colors', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    storeState.current = {};
  });

  it('uses explicit per-taxon colors for row labels in taxa mode', async () => {
    const { MSAProvider } = await import('../../../src/components/msa/MSAContext.jsx');
    const { useMSA } = await import('../../../src/components/msa/useMSA.js');
    let observedRowColorMap = null;

    function Consumer() {
      observedRowColorMap = useMSA().rowColorMap;
      return null;
    }

    storeState.current = {
      hasMsa: true,
      msaSequences: {
        'taxon-a': 'ACGT',
        'taxon-b': 'ACGT',
      },
      msaRegion: null,
      setMsaRegion: vi.fn(),
      clearMsaRegion: vi.fn(),
      msaPreviousRegion: null,
      msaRowOrder: null,
      taxaColorVersion: 0,
      taxaGrouping: {
        mode: 'taxa',
        taxaColorMap: {
          'taxon-a': '#123456',
        },
      },
    };

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(React.createElement(MSAProvider, null, React.createElement(Consumer)));
    });

    expect(observedRowColorMap).toEqual({
      'taxon-a': '#123456',
    });

    await act(async () => {
      root.unmount();
    });
  });
});
