// @vitest-environment jsdom

import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { Deck } from '@deck.gl/core';
import { DeckGLContext } from '../src/treeVisualisation/deckgl/context/DeckGLContext.js';
import { VIEW_IDS } from '../src/treeVisualisation/deckgl/context/viewConstants.js';
import { useAppStore } from '../src/state/phyloStore/store.js';

vi.mock('@deck.gl/core', async () => {
  const actual = await vi.importActual('@deck.gl/core');
  return {
    ...actual,
    Deck: vi.fn().mockImplementation(() => ({
      setProps: vi.fn(),
      finalize: vi.fn(),
      redraw: vi.fn(),
    })),
  };
});

describe('DeckGLContext view state handling', () => {
  const initialStoreState = useAppStore.getState();

  beforeEach(() => {
    useAppStore.setState({ ...initialStoreState }, true);
    vi.stubGlobal('requestAnimationFrame', (callback) => {
      callback();
      return 1;
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    useAppStore.setState({ ...initialStoreState }, true);
  });

  function createContext() {
    const context = new DeckGLContext(document.createElement('div'));
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

  it('notifies view state listeners with the latest pending view id', () => {
    const rafCallbacks = [];
    vi.stubGlobal('requestAnimationFrame', (callback) => {
      rafCallbacks.push(callback);
      return rafCallbacks.length;
    });
    const context = createContext();
    const listener = vi.fn();
    context.addViewStateListener(listener);

    context._handleViewStateChange({ zoom: 2 }, VIEW_IDS.ORTHO);
    context._handleViewStateChange({ zoom: 4 }, VIEW_IDS.ORBIT);
    rafCallbacks[0]();

    expect(listener).toHaveBeenCalledWith(expect.objectContaining({ zoom: 4 }));
  });

  it('initializes against a native HTMLElement container', () => {
    const container = document.createElement('div');
    const oldChild = document.createElement('span');
    container.appendChild(oldChild);

    const context = new DeckGLContext(container);
    context.initialize();

    expect(container.contains(oldChild)).toBe(false);
    expect(container.querySelector('canvas')).toBe(context.canvas);
  });

  it('puts controller config on the active view instead of using Deck top-level controller', () => {
    const container = document.createElement('div');
    const context = new DeckGLContext(container);

    context.initialize();

    const deckProps = Deck.mock.calls.at(-1)[0];
    expect(deckProps).not.toHaveProperty('controller');
    expect(deckProps.views[0].props.controller).toEqual(context.getControllerConfig());
  });

  it('zooms the active view around its current target', () => {
    const context = createContext();
    context.viewStates[VIEW_IDS.ORTHO].zoom = 1;
    context.viewStates[VIEW_IDS.ORTHO].target = [4, 5, 0];

    context.zoomBy(0.5, { duration: 0 });

    expect(context.viewStates[VIEW_IDS.ORTHO].zoom).toBe(1.5);
    expect(context.viewStates[VIEW_IDS.ORTHO].target).toEqual([4, 5, 0]);
  });

  it('resets the active view to its default camera state', () => {
    const context = createContext();
    context.viewStates[VIEW_IDS.ORTHO].zoom = 3;
    context.viewStates[VIEW_IDS.ORTHO].target = [40, -10, 0];

    context.resetView({ duration: 0 });

    expect(context.viewStates[VIEW_IDS.ORTHO].zoom).toBe(0);
    expect(context.viewStates[VIEW_IDS.ORTHO].target).toEqual([0, 0, 0]);
  });

  it('escapes tooltip taxon and grouping values before returning HTML', () => {
    const context = createContext();
    useAppStore.setState({
      taxaGrouping: {
        mode: 'csv',
        csvData: {
          taxaData: {
            '<img src=x onerror=alert(1)>': {
              '<b>Group</b>': '<script>alert(1)</script>',
            },
          },
        },
      },
    });

    const tooltip = context._getTooltip({
      object: { text: '<img src=x onerror=alert(1)>' },
    });

    expect(tooltip.html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(tooltip.html).toContain('&lt;b&gt;Group&lt;/b&gt;');
    expect(tooltip.html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(tooltip.html).not.toContain('<img');
    expect(tooltip.html).not.toContain('<script>');
  });
});
