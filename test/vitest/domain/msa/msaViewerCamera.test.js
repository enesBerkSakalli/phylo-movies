import { describe, expect, it } from 'vitest';
import {
  deriveSynchronizedViewStates,
  getCenteredViewState,
  getInitialAlignmentViewState,
  getFitAlignmentViewState,
  getRegionFocusViewState,
} from '../../../../src/msaViewer/cameraUtils.js';

describe('MSA viewer camera utilities', () => {
  it('initializes the camera on the top-left visible alignment cell', () => {
    expect(
      getInitialAlignmentViewState({
        containerWidth: 500,
        containerHeight: 300,
        labelsWidth: 100,
        axisHeight: 20,
      })
    ).toEqual({
      target: [200, 140, 0],
      zoom: 0,
    });
  });

  it('fits the full alignment while capping zoom at readable 1:1 scale', () => {
    const viewState = getFitAlignmentViewState({
      containerWidth: 500,
      containerHeight: 300,
      labelsWidth: 100,
      axisHeight: 20,
      cellSize: 10,
      rows: 10,
      cols: 20,
    });

    expect(viewState.target).toEqual([100, 50, 0]);
    expect(viewState.zoom).toBeCloseTo(-0.1);
  });

  it('derives locked label, axis, and corner view states from main view state', () => {
    const states = deriveSynchronizedViewStates({
      mainViewState: { target: [120, 80, 0], zoom: 1 },
      labelsWidth: 100,
      axisHeight: 20,
    });

    expect(states.main).toEqual({ target: [120, 80, 0], zoom: 1 });
    expect(states.labels.target).toEqual([25, 80, 0]);
    expect(states.axis.target).toEqual([120, 5, 0]);
    expect(states.corner.target).toEqual([25, 5, 0]);
  });

  it('scrolls only the requested axes while preserving zoom', () => {
    expect(
      getCenteredViewState({
        currentViewState: { target: [10, 20, 0], zoom: 2 },
        cellSize: 12,
        row: 3,
        column: 5,
      })
    ).toEqual({
      target: [66, 42, 0],
      zoom: 2,
    });
  });

  it('zooms out just enough to show the whole region when it is wider than the view', () => {
    const viewState = getRegionFocusViewState({
      currentViewState: { target: [0, 77, 0], zoom: 0 },
      containerWidth: 500,
      labelsWidth: 100,
      cellSize: 10,
      startCol: 201,
      endCol: 400,
    });

    // 200 columns * 10px * 1.1 padding = 2200px of content into 400px of view.
    expect(viewState.zoom).toBeCloseTo(Math.log2(400 / 2200));
    expect(viewState.target).toEqual([3000, 77, 0]);
  });

  it('keeps the current zoom when the region already fits', () => {
    const viewState = getRegionFocusViewState({
      currentViewState: { target: [0, 77, 0], zoom: -1 },
      containerWidth: 500,
      labelsWidth: 100,
      cellSize: 10,
      startCol: 11,
      endCol: 20,
    });

    expect(viewState.zoom).toBe(-1);
    expect(viewState.target).toEqual([150, 77, 0]);
  });
});
