// @vitest-environment jsdom
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let msaContext;
const viewerInstances = [];

vi.mock('@/components/msa/MSAContext', () => ({
  useMSA: () => msaContext
}));

vi.mock('@/msaViewer/MSADeckGLViewer', () => ({
  MSADeckGLViewer: class MockMSADeckGLViewer {
    constructor() {
      this.loadFromProcessedData = vi.fn();
      this.setRegion = vi.fn();
      this.clearRegion = vi.fn();
      this.setPreviousRegion = vi.fn();
      this.clearPreviousRegion = vi.fn();
      this.scrollTo = vi.fn();
      this.destroy = vi.fn();
      this.render = vi.fn();
      this.setShowLetters = vi.fn();
      this.setColorScheme = vi.fn();
      this.setRowColorMap = vi.fn();
      viewerInstances.push(this);
    }
  }
}));

const processedData = {
  sequences: [
    { id: 'taxon-a', seq: 'ACGT' },
    { id: 'taxon-b', seq: 'ACGA' }
  ],
  type: 'dna',
  rows: 2,
  cols: 4
};

function createContext(overrides = {}) {
  return {
    processedData,
    msaRegion: { start: 1, end: 2 },
    msaPreviousRegion: null,
    showLetters: true,
    viewAction: null,
    colorScheme: 'default',
    setVisibleRange: vi.fn(),
    rowColorMap: {},
    visibleRange: { r0: 0, r1: 1, c0: 0, c1: 1 },
    scrollAction: null,
    scrollToPosition: vi.fn(),
    ...overrides
  };
}

async function renderReact(element) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(element);
  });

  return { container, root };
}

afterEach(() => {
  viewerInstances.length = 0;
  msaContext = null;
  document.body.innerHTML = '';
  vi.clearAllMocks();
});

describe('MSA viewer contract', () => {
  it('loads processed alignment data only when processed data changes', async () => {
    const { MSAViewer } = await import('@/components/msa/MSAViewer.jsx');

    msaContext = createContext({ msaRegion: { start: 1, end: 2 } });
    const { root } = await renderReact(React.createElement(MSAViewer));
    const viewer = viewerInstances[0];

    expect(viewer.loadFromProcessedData).toHaveBeenCalledTimes(1);
    expect(viewer.loadFromProcessedData).toHaveBeenCalledWith(processedData);

    msaContext = createContext({ msaRegion: { start: 2, end: 3 } });
    await act(async () => {
      root.render(React.createElement(MSAViewer));
    });

    expect(viewer.loadFromProcessedData).toHaveBeenCalledTimes(1);
    expect(viewer.setRegion).toHaveBeenLastCalledWith(2, 3);

    await act(async () => {
      root.unmount();
    });
  });

  it('applies an initial previous region after the viewer is created', async () => {
    const { MSAViewer } = await import('@/components/msa/MSAViewer.jsx');

    msaContext = createContext({ msaPreviousRegion: { start: 3, end: 4 } });
    const { root } = await renderReact(React.createElement(MSAViewer));
    const viewer = viewerInstances[0];

    expect(viewer.loadFromProcessedData).toHaveBeenCalledTimes(1);
    expect(viewer.setPreviousRegion).toHaveBeenCalledWith(3, 4);

    await act(async () => {
      root.unmount();
    });
  });

  it('updates layout metrics even when range updates are throttled', async () => {
    const { MSAViewer } = await import('@/components/msa/MSAViewer.jsx');
    const dateNow = vi.spyOn(Date, 'now');
    const setVisibleRange = vi.fn();

    try {
      msaContext = createContext({ setVisibleRange });
      const { container, root } = await renderReact(React.createElement(MSAViewer));
      const viewer = viewerInstances[0];

      dateNow.mockReturnValue(1_000);
      await act(async () => {
        viewer.onViewStateChange({
          range: { r0: 0, r1: 1, c0: 0, c1: 1 },
          layoutMetrics: { labelsWidth: 72, axisHeight: 20 }
        });
      });

      dateNow.mockReturnValue(1_010);
      await act(async () => {
        viewer.onViewStateChange({
          range: { r0: 0, r1: 1, c0: 1, c1: 2 },
          layoutMetrics: { labelsWidth: 96, axisHeight: 24 }
        });
      });

      const scrollbars = container.querySelectorAll('[role="scrollbar"]');
      expect(setVisibleRange).toHaveBeenCalledTimes(1);
      expect(scrollbars[0].style.marginLeft).to.equal('96px');
      expect(scrollbars[1].style.marginTop).to.equal('24px');

      await act(async () => {
        root.unmount();
      });
    } finally {
      dateNow.mockRestore();
    }
  });

  it('positions custom scrollbars from viewer layout metrics', async () => {
    const { MSAScrollbars } = await import('@/components/msa/MSAScrollbars.jsx');

    msaContext = createContext();
    const { container, root } = await renderReact(
      React.createElement(MSAScrollbars, {
        layoutMetrics: {
          labelsWidth: 72,
          axisHeight: 20
        }
      })
    );

    const scrollbars = container.querySelectorAll('[role="scrollbar"]');
    expect(scrollbars).to.have.length(2);
    expect(scrollbars[0].style.marginLeft).to.equal('72px');
    expect(scrollbars[1].style.marginTop).to.equal('20px');

    await act(async () => {
      root.unmount();
    });
  });
});
