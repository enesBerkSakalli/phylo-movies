// @vitest-environment jsdom
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let msaContext;
let connectedCommands;
const viewerInstances = [];
const connectViewerCommands = vi.fn((commands) => {
  connectedCommands = commands;
  return () => {
    if (connectedCommands === commands) connectedCommands = null;
  };
});

vi.mock('../../../../src/components/msa/useMSA.js', () => ({
  useMSA: () => msaContext,
  useMSAViewport: () => msaContext,
  useSetMSAVisibleRange: () => msaContext.setVisibleRange,
}));

vi.mock('../../../../src/msaViewer/MSADeckGLViewer', () => ({
  MSADeckGLViewer: class MockMSADeckGLViewer {
    constructor() {
      this.update = vi.fn();
      this.centerRegion = vi.fn();
      this.centerViewportOn = vi.fn();
      this.zoomIn = vi.fn();
      this.zoomOut = vi.fn();
      this.fitAlignment = vi.fn();
      this.destroy = vi.fn();
      viewerInstances.push(this);
    }
  },
}));

const processedData = {
  sequences: [
    { id: 'taxon-a', seq: 'ACGT' },
    { id: 'taxon-b', seq: 'ACGA' },
  ],
  type: 'dna',
  rows: 2,
  cols: 4,
};

function createContext(overrides = {}) {
  return {
    processedData,
    msaRegion: { start: 1, end: 2 },
    msaPreviousRegion: null,
    showLetters: true,
    colorScheme: 'default',
    setVisibleRange: vi.fn(),
    rowColorMap: {},
    visibleRange: { r0: 0, r1: 1, c0: 0, c1: 1 },
    connectViewerCommands,
    centerViewportOn: vi.fn(),
    ...overrides,
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
  connectedCommands = null;
  msaContext = null;
  document.body.innerHTML = '';
  vi.clearAllMocks();
});

describe('MSA viewer contract', () => {
  it('sends one transactional viewer snapshot per relevant change', async () => {
    const { MSAViewer } = await import('../../../../src/components/msa/MSAViewer.jsx');

    msaContext = createContext({ msaRegion: { start: 1, end: 2 } });
    const { root } = await renderReact(React.createElement(MSAViewer));
    const viewer = viewerInstances[0];

    expect(viewer.update).toHaveBeenCalledTimes(1);
    expect(viewer.update).toHaveBeenCalledWith({
      data: processedData,
      currentRegion: { start: 1, end: 2 },
      previousRegion: null,
      showLetters: true,
      colorScheme: 'default',
      rowColorMap: {},
    });

    msaContext = createContext({ msaRegion: { start: 2, end: 3 } });
    await act(async () => {
      root.render(React.createElement(MSAViewer));
    });

    expect(viewer.update).toHaveBeenCalledTimes(2);
    expect(viewer.update).toHaveBeenLastCalledWith({
      data: processedData,
      currentRegion: { start: 2, end: 3 },
      previousRegion: null,
      showLetters: true,
      colorScheme: 'default',
      rowColorMap: {},
    });

    await act(async () => {
      root.unmount();
    });
  });

  it('delegates synced region centering to the viewer API', async () => {
    const { MSAViewer } = await import('../../../../src/components/msa/MSAViewer.jsx');

    msaContext = createContext({ msaRegion: { start: 2, end: 4 } });
    const { root } = await renderReact(React.createElement(MSAViewer));
    const viewer = viewerInstances[0];

    expect(viewer.update).toHaveBeenCalledWith(
      expect.objectContaining({ currentRegion: { start: 2, end: 4 } })
    );
    expect(viewer.centerRegion).toHaveBeenCalledWith(2, 4);

    await act(async () => {
      root.unmount();
    });
  });

  it('executes viewport commands directly without state mailboxes', async () => {
    const { MSAViewer } = await import('../../../../src/components/msa/MSAViewer.jsx');
    msaContext = createContext();
    const { root } = await renderReact(React.createElement(MSAViewer));
    const viewer = viewerInstances[0];

    connectedCommands.zoomIn();
    connectedCommands.zoomOut();
    connectedCommands.fitAlignment();
    connectedCommands.centerViewportOn({ column: 12, row: 3 });

    expect(viewer.zoomIn).toHaveBeenCalledTimes(1);
    expect(viewer.zoomOut).toHaveBeenCalledTimes(1);
    expect(viewer.fitAlignment).toHaveBeenCalledTimes(1);
    expect(viewer.centerViewportOn).toHaveBeenCalledWith({ column: 12, row: 3 });

    await act(async () => {
      root.unmount();
    });
  });

  it('applies an initial previous region after the viewer is created', async () => {
    const { MSAViewer } = await import('../../../../src/components/msa/MSAViewer.jsx');

    msaContext = createContext({ msaPreviousRegion: { start: 3, end: 4 } });
    const { root } = await renderReact(React.createElement(MSAViewer));
    const viewer = viewerInstances[0];

    expect(viewer.update).toHaveBeenCalledWith(
      expect.objectContaining({ previousRegion: { start: 3, end: 4 } })
    );

    await act(async () => {
      root.unmount();
    });
  });

  it('clears rendered alignment data when processed data disappears', async () => {
    const { MSAViewer } = await import('../../../../src/components/msa/MSAViewer.jsx');

    msaContext = createContext();
    const { root } = await renderReact(React.createElement(MSAViewer));
    const viewer = viewerInstances[0];

    expect(viewer.update).toHaveBeenCalledWith(expect.objectContaining({ data: processedData }));

    msaContext = createContext({
      processedData: null,
      msaRegion: null,
      msaPreviousRegion: null,
      visibleRange: null,
    });
    await act(async () => {
      root.render(React.createElement(MSAViewer));
    });

    expect(viewer.update).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: null,
        currentRegion: null,
        previousRegion: null,
      })
    );

    await act(async () => {
      root.unmount();
    });
  });

  it('publishes the latest visible range on the next animation frame', async () => {
    const { MSAViewer } = await import('../../../../src/components/msa/MSAViewer.jsx');
    const setVisibleRange = vi.fn();
    const rafCallbacks = [];
    const requestAnimationFrameSpy = vi
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((callback) => {
        rafCallbacks.push(callback);
        return rafCallbacks.length;
      });
    const cancelAnimationFrameSpy = vi
      .spyOn(window, 'cancelAnimationFrame')
      .mockImplementation(() => {});

    try {
      msaContext = createContext({ setVisibleRange });
      const { container, root } = await renderReact(React.createElement(MSAViewer));
      const viewer = viewerInstances[0];

      await act(async () => {
        viewer.onViewStateChange({
          range: { r0: 0, r1: 1, c0: 0, c1: 1 },
          layoutMetrics: { labelsWidth: 72, axisHeight: 20 },
        });
      });

      await act(async () => {
        viewer.onViewStateChange({
          range: { r0: 0, r1: 1, c0: 1, c1: 2 },
          layoutMetrics: { labelsWidth: 96, axisHeight: 24 },
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

  it('lets users clip and restore the alignment status overlay', async () => {
    const { MSAViewer } = await import('../../../../src/components/msa/MSAViewer.jsx');

    msaContext = createContext();
    const { container, root } = await renderReact(React.createElement(MSAViewer));

    const clipButton = container.querySelector(
      'button[aria-label="Clip alignment status overlay"]'
    );
    expect(clipButton).not.toBeNull();

    await act(async () => {
      clipButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(
      container.querySelector('button[aria-label="Clip alignment status overlay"]')
    ).toBeNull();
    expect(
      container.querySelector('button[aria-label="Show alignment status overlay"]')
    ).not.toBeNull();
    expect(container.textContent).not.toContain('Rows: 1-2');

    await act(async () => {
      root.unmount();
    });
  });

  it('positions custom scrollbars from viewer layout metrics', async () => {
    const { MSAScrollbars } = await import('../../../../src/components/msa/MSAScrollbars.jsx');

    msaContext = createContext();
    const { container, root } = await renderReact(
      React.createElement(MSAScrollbars, {
        layoutMetrics: {
          labelsWidth: 72,
          axisHeight: 20,
        },
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
    const { MSAScrollbars } = await import('../../../../src/components/msa/MSAScrollbars.jsx');

    msaContext = createContext({
      processedData: { ...processedData, rows: 100, cols: 100 },
      visibleRange: { r0: 95, r1: 99, c0: 95, c1: 99 },
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
    const { MSAScrollbars } = await import('../../../../src/components/msa/MSAScrollbars.jsx');
    const centerViewportOn = vi.fn();

    msaContext = createContext({
      processedData: { ...processedData, rows: 100, cols: 100 },
      visibleRange: { r0: 10, r1: 19, c0: 10, c1: 19 },
      centerViewportOn,
    });
    const { container, root } = await renderReact(React.createElement(MSAScrollbars));
    const scrollbars = container.querySelectorAll('[role="scrollbar"]');
    const hThumb = scrollbars[0].firstElementChild;

    expect(scrollbars[0].tabIndex).to.equal(0);
    expect(scrollbars[1].tabIndex).to.equal(0);

    await act(async () => {
      scrollbars[0].dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })
      );
      scrollbars[1].dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })
      );
    });

    expect(centerViewportOn).toHaveBeenCalledWith({ column: 15.5 });
    expect(centerViewportOn).toHaveBeenCalledWith({ row: 15.5 });

    hThumb.getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      width: 10,
      height: 10,
      right: 10,
      bottom: 10,
    });
    scrollbars[0].getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      width: 200,
      height: 12,
      right: 200,
      bottom: 12,
    });
    const PointerEventCtor =
      window.PointerEvent ??
      class TestPointerEvent extends MouseEvent {
        constructor(type, init = {}) {
          super(type, init);
          Object.defineProperty(this, 'pointerId', { value: init.pointerId ?? 0 });
        }
      };

    await act(async () => {
      hThumb.dispatchEvent(
        new PointerEventCtor('pointerdown', { pointerId: 1, clientX: 20, bubbles: true })
      );
      window.dispatchEvent(
        new PointerEventCtor('pointermove', { pointerId: 1, clientX: 100, bubbles: true })
      );
      window.dispatchEvent(
        new PointerEventCtor('pointerup', { pointerId: 1, clientX: 100, bubbles: true })
      );
    });

    expect(centerViewportOn).toHaveBeenCalledWith({ column: 50 });

    await act(async () => {
      root.unmount();
    });
  });

  it('removes active drag listeners when scrollbars unmount mid-drag', async () => {
    const { MSAScrollbars } = await import('../../../../src/components/msa/MSAScrollbars.jsx');
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

    msaContext = createContext({
      processedData: { ...processedData, rows: 100, cols: 100 },
      visibleRange: { r0: 10, r1: 19, c0: 10, c1: 19 },
      centerViewportOn: vi.fn(),
    });
    const { container, root } = await renderReact(React.createElement(MSAScrollbars));
    const scrollbars = container.querySelectorAll('[role="scrollbar"]');
    const hThumb = scrollbars[0].firstElementChild;
    const PointerEventCtor =
      window.PointerEvent ??
      class TestPointerEvent extends MouseEvent {
        constructor(type, init = {}) {
          super(type, init);
          Object.defineProperty(this, 'pointerId', { value: init.pointerId ?? 0 });
        }
      };

    await act(async () => {
      hThumb.dispatchEvent(
        new PointerEventCtor('pointerdown', { pointerId: 1, clientX: 20, bubbles: true })
      );
    });

    const pointerMoveListener = addEventListenerSpy.mock.calls.find(
      ([type]) => type === 'pointermove'
    )?.[1];
    const pointerUpListener = addEventListenerSpy.mock.calls.find(
      ([type]) => type === 'pointerup'
    )?.[1];
    const pointerCancelListener = addEventListenerSpy.mock.calls.find(
      ([type]) => type === 'pointercancel'
    )?.[1];

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
    const { MSAScrollbars } = await import('../../../../src/components/msa/MSAScrollbars.jsx');
    const centerViewportOn = vi.fn();

    msaContext = createContext({
      processedData: { ...processedData, rows: 100, cols: 100 },
      visibleRange: { r0: 10, r1: 19, c0: 10, c1: 19 },
      centerViewportOn,
    });
    const { container, root } = await renderReact(React.createElement(MSAScrollbars));
    const scrollbars = container.querySelectorAll('[role="scrollbar"]');

    scrollbars[0].getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      width: 200,
      height: 12,
      right: 200,
      bottom: 12,
    });
    scrollbars[1].getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      width: 12,
      height: 200,
      right: 12,
      bottom: 200,
    });

    await act(async () => {
      scrollbars[0].dispatchEvent(new MouseEvent('click', { clientX: 200, bubbles: true }));
      scrollbars[1].dispatchEvent(new MouseEvent('click', { clientY: 200, bubbles: true }));
    });

    expect(centerViewportOn).toHaveBeenCalledWith({ column: 99 });
    expect(centerViewportOn).toHaveBeenCalledWith({ row: 99 });

    await act(async () => {
      root.unmount();
    });
  });
});
