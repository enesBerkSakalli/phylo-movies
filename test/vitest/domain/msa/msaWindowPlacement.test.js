import { describe, expect, it } from 'vitest';
import {
  MSA_WINDOW_BOUNDS,
  placeMsaWindowRect,
} from '../../../../src/components/msa/msaWindowPlacement.js';

const DESKTOP = { width: 1440, height: 900 };
// Sidebar 224px wide on the left, player bar 171px tall at the bottom.
const DESKTOP_CANVAS = { left: 224, top: 0, right: 1440, bottom: 729 };

describe('MSA window placement', () => {
  it('opens anchored to the bottom-right of the canvas area, sized from it', () => {
    const rect = placeMsaWindowRect(
      { x: Infinity, y: Infinity, width: Infinity, height: Infinity },
      DESKTOP,
      DESKTOP_CANVAS
    );

    // 55% of the 1216px canvas width, capped at 720; 40% of the 729px height.
    expect(rect).toMatchObject({ width: 669, height: 292 });
    expect(rect.x).toBe(1440 - 669 - MSA_WINDOW_BOUNDS.margin);
    expect(rect.y).toBe(729 - 292 - MSA_WINDOW_BOUNDS.margin);
  });

  it('keeps a size the user chose', () => {
    const rect = placeMsaWindowRect(
      { x: 300, y: 100, width: 640, height: 380 },
      DESKTOP,
      DESKTOP_CANVAS
    );
    expect(rect).toMatchObject({ x: 300, y: 100, width: 640, height: 380 });
  });

  it('never covers the sidebar or the player bar', () => {
    const rect = placeMsaWindowRect(
      { x: 0, y: 800, width: 2000, height: 2000 },
      DESKTOP,
      DESKTOP_CANVAS
    );

    expect(rect.x).toBeGreaterThanOrEqual(224);
    expect(rect.y + rect.height).toBeLessThanOrEqual(729);
    expect(rect.x + rect.width).toBeLessThanOrEqual(1440);
  });

  it('becomes a full-width top sheet on narrow screens, clear of the inspector sheet', () => {
    const viewport = { width: 390, height: 844 };
    const rect = placeMsaWindowRect({ x: 40, y: 40, width: 640, height: 380 }, viewport, {
      left: 0,
      top: 0,
      right: 390,
      bottom: 638,
    });

    expect(rect.x).toBe(MSA_WINDOW_BOUNDS.margin);
    expect(rect.width).toBe(390 - MSA_WINDOW_BOUNDS.margin * 2);
    expect(rect.y).toBe(MSA_WINDOW_BOUNDS.margin);
    expect(rect.height).toBe(Math.round(638 * 0.45));
  });
});
