import { describe, expect, it, vi } from 'vitest';
import {
  cancelPendingFrame,
  disconnectObserver,
  finalizeDeck,
  removeCreatedElement,
  teardownDeckRenderer,
} from '../../../../src/lib/deckTeardown.js';

function makeElement() {
  const element = {};
  const parent = { removeChild: vi.fn() };
  element.parentNode = parent;
  return { element, parent };
}

describe('deck teardown helpers', () => {
  it('cancels a scheduled frame and ignores an absent one', () => {
    const cancel = vi.fn();
    vi.stubGlobal('cancelAnimationFrame', cancel);

    expect(cancelPendingFrame(7)).toBeNull();
    expect(cancel).toHaveBeenCalledWith(7);

    cancel.mockClear();
    cancelPendingFrame(null);
    cancelPendingFrame(undefined);
    expect(cancel).not.toHaveBeenCalled();

    // Frame id 0 is a legitimate id, so it must not be skipped as falsy.
    cancelPendingFrame(0);
    expect(cancel).toHaveBeenCalledWith(0);
    vi.unstubAllGlobals();
  });

  it('disconnects an observer and tolerates none', () => {
    const observer = { disconnect: vi.fn() };
    expect(disconnectObserver(observer)).toBeNull();
    expect(observer.disconnect).toHaveBeenCalledOnce();
    expect(() => disconnectObserver(null)).not.toThrow();
  });

  it('finalizes a deck and tolerates none', () => {
    const deck = { finalize: vi.fn() };
    expect(finalizeDeck(deck)).toBeNull();
    expect(deck.finalize).toHaveBeenCalledOnce();
    expect(() => finalizeDeck(null)).not.toThrow();
    expect(() => finalizeDeck(undefined)).not.toThrow();
  });

  it('throws when given something that is not a Deck', () => {
    // Documents the contract rather than guarding a regression: optional
    // chaining would throw here too, since it short-circuits on a nullish
    // receiver, not on a missing property.
    expect(() => finalizeDeck({})).toThrow(TypeError);
  });

  it('removes an element it still owns', () => {
    const { element, parent } = makeElement();
    expect(removeCreatedElement(element, '[test]')).toBeNull();
    expect(parent.removeChild).toHaveBeenCalledWith(element);
  });

  it('removes the element when it is still the expected parent-s child', () => {
    const { element, parent } = makeElement();
    removeCreatedElement(element, '[test]', parent);
    expect(parent.removeChild).toHaveBeenCalledWith(element);
  });

  it('leaves a reparented element alone when an expected parent was given', () => {
    const { element, parent } = makeElement();
    const container = { removeChild: vi.fn() };

    removeCreatedElement(element, '[test]', container);

    expect(parent.removeChild).not.toHaveBeenCalled();
    expect(container.removeChild).not.toHaveBeenCalled();
  });

  it('leaves a detached element alone', () => {
    const element = { parentNode: null };
    expect(() => removeCreatedElement(element, '[test]')).not.toThrow();
  });

  it('warns instead of throwing when removal fails', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { element, parent } = makeElement();
    parent.removeChild.mockImplementation(() => {
      throw new Error('detached');
    });

    expect(() => removeCreatedElement(element, '[test]')).not.toThrow();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('tolerates an element that was never created', () => {
    expect(() => removeCreatedElement(null, '[test]')).not.toThrow();
    expect(() => removeCreatedElement(undefined, '[test]')).not.toThrow();
  });

  it('runs the full sequence in order: stop work, stop observing, finalize, detach', () => {
    const order = [];
    const cancel = vi.fn(() => order.push('frame'));
    vi.stubGlobal('cancelAnimationFrame', cancel);

    const resizeObserver = { disconnect: vi.fn(() => order.push('observer')) };
    const deck = { finalize: vi.fn(() => order.push('finalize')) };
    const { element, parent } = makeElement();
    parent.removeChild.mockImplementation(() => order.push('detach'));

    teardownDeckRenderer({ frameId: 3, resizeObserver, deck, element, label: '[test]' });

    expect(order).toEqual(['frame', 'observer', 'finalize', 'detach']);
    vi.unstubAllGlobals();
  });

  it('honours expectedParent through the full sequence', () => {
    const resizeObserver = { disconnect: vi.fn() };
    const deck = { finalize: vi.fn() };
    const { element, parent } = makeElement();

    teardownDeckRenderer({
      frameId: null,
      resizeObserver,
      deck,
      element,
      expectedParent: { removeChild: vi.fn() },
      label: '[test]',
    });

    // The deck is still finalized; only the detach is declined.
    expect(deck.finalize).toHaveBeenCalledOnce();
    expect(resizeObserver.disconnect).toHaveBeenCalledOnce();
    expect(parent.removeChild).not.toHaveBeenCalled();
  });

  it('completes even when a renderer never got as far as creating anything', () => {
    expect(() =>
      teardownDeckRenderer({
        frameId: null,
        resizeObserver: null,
        deck: null,
        element: null,
        label: '[test]',
      })
    ).not.toThrow();
  });
});
