import { describe, expect, it } from 'vitest';
import { fitFloatingWindowRect } from '../src/components/ui/floatingWindowGeometry.js';

describe('floating window geometry', () => {
  it('keeps oversized windows inside the viewport', () => {
    const rect = fitFloatingWindowRect(
      { x: 900, y: -50, width: 960, height: 700 },
      {
        viewportWidth: 700,
        viewportHeight: 500,
        minWidth: 600,
        minHeight: 400,
        margin: 24,
      }
    );

    expect(rect).toEqual({
      x: 24,
      y: 24,
      width: 652,
      height: 452,
      minWidth: 600,
      minHeight: 400,
    });
  });

  it('uses viewport-safe minimums when the viewport is smaller than the desired minimum', () => {
    const rect = fitFloatingWindowRect(
      { x: 40, y: 40, width: 960, height: 620 },
      {
        viewportWidth: 360,
        viewportHeight: 300,
        minWidth: 600,
        minHeight: 400,
        margin: 16,
      }
    );

    expect(rect).toEqual({
      x: 16,
      y: 16,
      width: 328,
      height: 268,
      minWidth: 328,
      minHeight: 268,
    });
  });

  it('leaves already valid windows unchanged', () => {
    const rect = fitFloatingWindowRect(
      { x: 80, y: 60, width: 640, height: 420 },
      {
        viewportWidth: 1200,
        viewportHeight: 800,
        minWidth: 500,
        minHeight: 320,
        margin: 24,
      }
    );

    expect(rect).toEqual({
      x: 80,
      y: 60,
      width: 640,
      height: 420,
      minWidth: 500,
      minHeight: 320,
    });
  });

  it('supports explicit app-chrome insets before clamping horizontal bounds', () => {
    const rect = fitFloatingWindowRect(
      { x: 40, y: 40, width: 900, height: 720 },
      {
        viewportWidth: 1000,
        viewportHeight: 750,
        leftInset: 220,
        minWidth: 620,
        minHeight: 480,
        margin: 24,
      }
    );

    expect(rect).toEqual({
      x: 244,
      y: 24,
      width: 732,
      height: 702,
      minWidth: 620,
      minHeight: 480,
    });
  });
});
