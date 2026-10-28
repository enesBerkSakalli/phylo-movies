// @vitest-environment jsdom
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const storeState = vi.hoisted(() => ({ current: {} }));

vi.mock('../../../../src/state/phyloStore/store.js', () => ({
  selectHasMsa: (state) => state.hasMsa,
  selectMsaPreviousRegion: (state) => state.msaPreviousRegion,
  selectMsaRegion: (state) => state.msaRegion,
  selectMsaRowOrder: (state) => state.msaRowOrder,
  selectMsaRowSplitIndex: (state) => state.msaRowSplitIndex,
  selectMsaSequences: (state) => state.msaSequences,
  selectTaxaColorVersion: (state) => state.taxaColorVersion,
  selectTaxaGrouping: (state) => state.taxaGrouping,
  useAppStore: (selector) => selector(storeState.current),
}));

describe('MSA context row colors', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    storeState.current = {};
  });

  it.each([null, 1])(
    'preserves row colors and split index %s in taxa mode',
    async (msaRowSplitIndex) => {
      const { MSAProvider } = await import('../../../../src/components/msa/MSAContext.jsx');
      const { useMSA } = await import('../../../../src/components/msa/useMSA.js');
      let observedRowColorMap = null;
      let observedRowSplitIndex;

      function Consumer() {
        observedRowColorMap = useMSA().rowColorMap;
        observedRowSplitIndex = useMSA().msaRowSplitIndex;
        return null;
      }

      storeState.current = {
        hasMsa: true,
        msaSequences: {
          'taxon-a': 'ACGT',
          'taxon-b': 'ACGT',
        },
        msaRegion: null,
        msaPreviousRegion: null,
        msaRowOrder: null,
        msaRowSplitIndex,
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
      expect(observedRowSplitIndex).toBe(msaRowSplitIndex);

      await act(async () => {
        root.unmount();
      });
    }
  );
});
