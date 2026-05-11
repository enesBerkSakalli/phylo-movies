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
      this.clearData = vi.fn();
      this.setRegion = vi.fn();
      this.clearRegion = vi.fn();
      this.setPreviousRegion = vi.fn();
      this.clearPreviousRegion = vi.fn();
      this.scrollTo = vi.fn();
      this.scrollToRegion = vi.fn();
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

  it('delegates synced region centering to the viewer API', async () => {
    const { MSAViewer } = await import('@/components/msa/MSAViewer.jsx');

    msaContext = createContext({ msaRegion: { start: 2, end: 4 } });
    const { root } = await renderReact(React.createElement(MSAViewer));
    const viewer = viewerInstances[0];

    expect(viewer.setRegion).toHaveBeenCalledWith(2, 4);
    expect(viewer.scrollToRegion).toHaveBeenCalledWith(2, 4, { align: 'center' });
    expect(viewer.scrollTo).not.toHaveBeenCalled();

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

  it('clears rendered alignment data when processed data disappears', async () => {
    const { MSAViewer } = await import('@/components/msa/MSAViewer.jsx');

    msaContext = createContext();
    const { root } = await renderReact(React.createElement(MSAViewer));
    const viewer = viewerInstances[0];

    expect(viewer.loadFromProcessedData).toHaveBeenCalledWith(processedData);

    msaContext = createContext({
      processedData: null,
      msaRegion: null,
      msaPreviousRegion: null,
      visibleRange: null
    });
    await act(async () => {
      root.render(React.createElement(MSAViewer));
    });

    expect(viewer.clearData).toHaveBeenCalledTimes(1);

    await act(async () => {
      root.unmount();
    });
  });

  it('publishes the latest visible range on the next animation frame', async () => {
    const { MSAViewer } = await import('@/components/msa/MSAViewer.jsx');
    const setVisibleRange = vi.fn();
    const rafCallbacks = [];
    const requestAnimationFrameSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      rafCallbacks.push(callback);
      return rafCallbacks.length;
    });
    const cancelAnimationFrameSpy = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});

    try {
      msaContext = createContext({ setVisibleRange });
      const { container, root } = await renderReact(React.createElement(MSAViewer));
      const viewer = viewerInstances[0];

      await act(async () => {
        viewer.onViewStateChange({
          range: { r0: 0, r1: 1, c0: 0, c1: 1 },
          layoutMetrics: { labelsWidth: 72, axisHeight: 20 }
        });
      });

      await act(async () => {
        viewer.onViewStateChange({
          range: { r0: 0, r1: 1, c0: 1, c1: 2 },
          layoutMetrics: { labelsWidth: 96, axisHeight: 24 }
        });
      });

      expect(setVisibleRange).not.toHaveBeenCalled();

      await act(async () => {
        rafCallbacks.shift()?.(1_000);
      });

      const scrollbars = container.querySelectorAll('[role="scrollbar"]');
      expect(setVisibleRange).toHaveBeenCalledTimes(1);
      expect(setVisibleRange).toHaveBeenCalledWith({ r0: 0, r1: 1, c0: 1, c1: 2 });
      expect(scrollbars[0].style.marginLeft).to.equal('96px');
      expect(scrollbars[1].style.marginTop).to.equal('24px');

      await act(async () => {
        root.unmount();
      });
    } finally {
      requestAnimationFrameSpy.mockRestore();
      cancelAnimationFrameSpy.mockRestore();
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

  it('caps custom scrollbar thumbs inside their tracks', async () => {
    const { MSAScrollbars } = await import('@/components/msa/MSAScrollbars.jsx');

    msaContext = createContext({
      processedData: { ...processedData, rows: 100, cols: 100 },
      visibleRange: { r0: 95, r1: 99, c0: 95, c1: 99 }
    });
    const { container, root } = await renderReact(React.createElement(MSAScrollbars));

    const scrollbars = container.querySelectorAll('[role="scrollbar"]');
    const hThumb = scrollbars[0].firstElementChild;
    const vThumb = scrollbars[1].firstElementChild;

    expect(hThumb.style.width).to.equal('10%');
    expect(hThumb.style.left).to.equal('90%');
    expect(vThumb.style.height).to.equal('10%');
    expect(vThumb.style.top).to.equal('90%');

    await act(async () => {
      root.unmount();
    });
  });

  it('supports keyboard and pointer scrollbar controls', async () => {
    const { MSAScrollbars } = await import('@/components/msa/MSAScrollbars.jsx');
    const scrollToPosition = vi.fn();

    msaContext = createContext({
      processedData: { ...processedData, rows: 100, cols: 100 },
      visibleRange: { r0: 10, r1: 19, c0: 10, c1: 19 },
      scrollToPosition
    });
    const { container, root } = await renderReact(React.createElement(MSAScrollbars));
    const scrollbars = container.querySelectorAll('[role="scrollbar"]');
    const hThumb = scrollbars[0].firstElementChild;

    expect(scrollbars[0].tabIndex).to.equal(0);
    expect(scrollbars[1].tabIndex).to.equal(0);

    await act(async () => {
      scrollbars[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
      scrollbars[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    });

    expect(scrollToPosition).toHaveBeenCalledWith({ col: 11 });
    expect(scrollToPosition).toHaveBeenCalledWith({ row: 11 });

    hThumb.getBoundingClientRect = () => ({ left: 0, top: 0, width: 10, height: 10, right: 10, bottom: 10 });
    scrollbars[0].getBoundingClientRect = () => ({ left: 0, top: 0, width: 200, height: 12, right: 200, bottom: 12 });
    const PointerEventCtor = window.PointerEvent ?? class TestPointerEvent extends MouseEvent {
      constructor(type, init = {}) {
        super(type, init);
        Object.defineProperty(this, 'pointerId', { value: init.pointerId ?? 0 });
      }
    };

    await act(async () => {
      hThumb.dispatchEvent(new PointerEventCtor('pointerdown', { pointerId: 1, clientX: 20, bubbles: true }));
      window.dispatchEvent(new PointerEventCtor('pointermove', { pointerId: 1, clientX: 100, bubbles: true }));
      window.dispatchEvent(new PointerEventCtor('pointerup', { pointerId: 1, clientX: 100, bubbles: true }));
    });

    expect(scrollToPosition).toHaveBeenCalledWith({ col: 50 });

    await act(async () => {
      root.unmount();
    });
  });

  it('removes active drag listeners when scrollbars unmount mid-drag', async () => {
    const { MSAScrollbars } = await import('@/components/msa/MSAScrollbars.jsx');
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

    msaContext = createContext({
      processedData: { ...processedData, rows: 100, cols: 100 },
      visibleRange: { r0: 10, r1: 19, c0: 10, c1: 19 },
      scrollToPosition: vi.fn()
    });
    const { container, root } = await renderReact(React.createElement(MSAScrollbars));
    const scrollbars = container.querySelectorAll('[role="scrollbar"]');
    const hThumb = scrollbars[0].firstElementChild;
    const PointerEventCtor = window.PointerEvent ?? class TestPointerEvent extends MouseEvent {
      constructor(type, init = {}) {
        super(type, init);
        Object.defineProperty(this, 'pointerId', { value: init.pointerId ?? 0 });
      }
    };

    await act(async () => {
      hThumb.dispatchEvent(new PointerEventCtor('pointerdown', { pointerId: 1, clientX: 20, bubbles: true }));
    });

    const pointerMoveListener = addEventListenerSpy.mock.calls.find(([type]) => type === 'pointermove')?.[1];
    const pointerUpListener = addEventListenerSpy.mock.calls.find(([type]) => type === 'pointerup')?.[1];
    const pointerCancelListener = addEventListenerSpy.mock.calls.find(([type]) => type === 'pointercancel')?.[1];

    await act(async () => {
      root.unmount();
    });

    expect(removeEventListenerSpy).toHaveBeenCalledWith('pointermove', pointerMoveListener);
    expect(removeEventListenerSpy).toHaveBeenCalledWith('pointerup', pointerUpListener);
    expect(removeEventListenerSpy).toHaveBeenCalledWith('pointercancel', pointerCancelListener);

    addEventListenerSpy.mockRestore();
    removeEventListenerSpy.mockRestore();
  });

  it('clamps custom scrollbar track clicks to the final row and column', async () => {
    const { MSAScrollbars } = await import('@/components/msa/MSAScrollbars.jsx');
    const scrollToPosition = vi.fn();

    msaContext = createContext({
      processedData: { ...processedData, rows: 100, cols: 100 },
      visibleRange: { r0: 10, r1: 19, c0: 10, c1: 19 },
      scrollToPosition
    });
    const { container, root } = await renderReact(React.createElement(MSAScrollbars));
    const scrollbars = container.querySelectorAll('[role="scrollbar"]');

    scrollbars[0].getBoundingClientRect = () => ({ left: 0, top: 0, width: 200, height: 12, right: 200, bottom: 12 });
    scrollbars[1].getBoundingClientRect = () => ({ left: 0, top: 0, width: 12, height: 200, right: 12, bottom: 200 });

    await act(async () => {
      scrollbars[0].dispatchEvent(new MouseEvent('click', { clientX: 200, bubbles: true }));
      scrollbars[1].dispatchEvent(new MouseEvent('click', { clientY: 200, bubbles: true }));
    });

    expect(scrollToPosition).toHaveBeenCalledWith({ col: 99 });
    expect(scrollToPosition).toHaveBeenCalledWith({ row: 99 });

    await act(async () => {
      root.unmount();
    });
  });
});
