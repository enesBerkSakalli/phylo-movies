import { describe, expect, it } from 'vitest';
import { useAppStore } from '../src/state/phyloStore/store.js';

describe('tree highlight state', () => {
  it('bumps colorVersion when marked color changes so deck.gl color accessors invalidate', () => {
    const previousState = useAppStore.getState();
    const previousColor = previousState.markedColor;
    const previousVersion = previousState.colorVersion;
    const nextColor = previousColor === '#123456' ? '#654321' : '#123456';

    try {
      previousState.setMarkedColor(nextColor);

      expect(useAppStore.getState().colorVersion).toBe(previousVersion + 1);
    } finally {
      useAppStore.getState().setMarkedColor(previousColor);
      useAppStore.setState({ markedColor: previousColor, colorVersion: previousVersion });
    }
  });
});
