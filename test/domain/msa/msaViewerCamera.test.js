import { describe, expect, it } from 'vitest';
import {
  deriveSynchronizedViewStates,
  getInitialAlignmentViewState,
  getFitAlignmentViewState,
  getScrollViewState,
} from '../../../src/msaViewer/cameraUtils.js';

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
      getScrollViewState({
        currentViewState: { target: [10, 20, 0], zoom: 2 },
        cellSize: 12,
        row: 3,
        col: 5,
      })
    ).toEqual({
      target: [66, 42, 0],
      zoom: 2,
    });
  });
});
