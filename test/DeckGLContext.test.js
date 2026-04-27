import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { DeckGLContext } from '../src/treeVisualisation/deckgl/context/DeckGLContext.js';
import { VIEW_IDS } from '../src/treeVisualisation/deckgl/context/viewConstants.js';

describe('DeckGLContext view state handling', () => {
  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', (callback) => {
      callback();
      return 1;
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  function createContext() {
    const context = new DeckGLContext(null);
    context.deck = { setProps: vi.fn() };
    return context;
  }

  it('keeps the current zoom when transitionTo receives only a target', () => {
    const context = createContext();
    context.viewStates[VIEW_IDS.ORTHO].zoom = 2;

    context.transitionTo({ target: [10, 20, 0], duration: 0 });

    expect(context.viewStates[VIEW_IDS.ORTHO].zoom).toBe(2);
    expect(Number.isNaN(context.viewStates[VIEW_IDS.ORTHO].zoom)).toBe(false);
    expect(context.viewStates[VIEW_IDS.ORTHO].target).toEqual([10, 20, 0]);
  });

  it('uses the active camera state when deck.gl omits viewId', () => {
    const context = createContext();
    context.cameraMode = 'orbit';

    context._handleViewStateChange({ zoom: 3 }, undefined);

    expect(context.viewStates[VIEW_IDS.ORBIT].zoom).toBe(3);
    expect(context.viewStates[VIEW_IDS.ORTHO].zoom).toBe(0);
  });
});
