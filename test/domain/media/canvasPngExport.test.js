// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createCanvasPngBlob,
  createPngFileName,
  getActiveTreeCanvas,
} from '../../../src/services/media/canvasPngExport.js';

describe('canvas PNG export helpers', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('selects the active tree canvas from the right-most controller', () => {
    const leftCanvas = { id: 'left-canvas' };
    const rightCanvas = { id: 'right-canvas' };
    const leftController = { deckContext: { canvas: leftCanvas } };
    const rightController = { deckContext: { canvas: rightCanvas } };

    expect(getActiveTreeCanvas([leftController, rightController])).toEqual({
      canvas: rightCanvas,
      reason: null,
      treeController: rightController,
    });
  });

  it('reports why no export canvas is available', () => {
    expect(getActiveTreeCanvas()).toEqual({
      canvas: null,
      reason: 'missing-controller',
    });

    const treeController = { deckContext: null };
    expect(getActiveTreeCanvas([treeController])).toEqual({
      canvas: null,
      reason: 'missing-canvas',
      treeController,
    });
  });

  it('creates stable frame-based PNG filenames', () => {
    expect(createPngFileName(0)).toBe('phylo-movie-export-1.png');
    expect(createPngFileName(41)).toBe('phylo-movie-export-42.png');
  });

  it('composites a WebGL canvas over white before encoding PNG', async () => {
    const sourceCanvas = { width: 320, height: 240 };
    const blob = new Blob(['png'], { type: 'image/png' });
    const context = {
      fillStyle: null,
      fillRect: vi.fn(),
      drawImage: vi.fn(),
    };
    const proxyCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => context),
      toBlob: vi.fn((callback, type) => {
        callback(blob);
        proxyCanvas.lastType = type;
      }),
    };
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
      if (tagName === 'canvas') return proxyCanvas;
      return originalCreateElement(tagName);
    });

    await expect(createCanvasPngBlob(sourceCanvas)).resolves.toBe(blob);

    expect(proxyCanvas.width).toBe(320);
    expect(proxyCanvas.height).toBe(240);
    expect(proxyCanvas.getContext).toHaveBeenCalledWith('2d');
    expect(context.fillStyle).toBe('#FFFFFF');
    expect(context.fillRect).toHaveBeenCalledWith(0, 0, 320, 240);
    expect(context.drawImage).toHaveBeenCalledWith(sourceCanvas, 0, 0);
    expect(proxyCanvas.lastType).toBe('image/png');
  });

  it('throws when the browser cannot encode a PNG blob', async () => {
    const proxyCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => ({
        fillRect: vi.fn(),
        drawImage: vi.fn(),
      })),
      toBlob: vi.fn((callback) => callback(null)),
    };
    vi.spyOn(document, 'createElement').mockReturnValue(proxyCanvas);

    await expect(createCanvasPngBlob({ width: 1, height: 1 })).rejects.toThrow(
      'Browser returned an empty PNG blob.'
    );
  });
});
