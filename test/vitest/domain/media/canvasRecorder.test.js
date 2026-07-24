// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { CanvasRecorder } from '../../../../src/services/media/canvasRecorder.js';
import { useAppStore } from '../../../../src/state/phyloStore/store.js';

describe('CanvasRecorder', () => {
  const initialStoreState = useAppStore.getState();

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    useAppStore.setState({ ...initialStoreState }, true);
  });

  it('captures the rendered WebGL canvas directly', async () => {
    const track = { stop: vi.fn() };
    const stream = { getTracks: () => [track] };
    const canvas = document.createElement('canvas');
    canvas.captureStream = vi.fn(() => stream);
    useAppStore.setState({ treeController: { deckContext: { canvas } } });

    class MediaRecorderMock {
      static isTypeSupported() {
        return true;
      }

      constructor(inputStream) {
        this.stream = inputStream;
        this.start = vi.fn();
      }
    }
    vi.stubGlobal('MediaRecorder', MediaRecorderMock);

    const recorder = new CanvasRecorder();
    await recorder.start();

    expect(canvas.captureStream).toHaveBeenCalledWith(60);
    expect(recorder.stream).toBe(stream);
    expect(recorder.mediaRecorder.stream).toBe(stream);
  });
});
