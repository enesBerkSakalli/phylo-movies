import { useEffect } from 'react';
import {
  selectBackward,
  selectForward,
  selectGoToNextInputTree,
  selectGoToPreviousInputTree,
  selectPlaying,
  selectStartAnimationPlayback,
  selectStopAnimationPlayback,
  useAppStore,
} from '../../state/phyloStore/store.js';

export const PLAYBACK_SHORTCUTS = Object.freeze({
  TOGGLE: 'toggle',
  NEXT_FRAME: 'next-frame',
  PREVIOUS_FRAME: 'previous-frame',
  NEXT_INPUT_TREE: 'next-input-tree',
  PREVIOUS_INPUT_TREE: 'previous-input-tree',
});

// Controls that own both Space and the arrow keys (typing, sliders, menus, and
// the deck.gl canvases, whose controllers pan with the arrow keys).
const KEY_OWNING_SELECTOR = [
  'canvas',
  'input',
  'textarea',
  'select',
  '[contenteditable=""]',
  '[contenteditable="true"]',
  '[role="slider"]',
  '[role="scrollbar"]',
  '[role="combobox"]',
  '[role="listbox"]',
  '[role="menu"]',
  '[role="menuitem"]',
  '[role="option"]',
  '[role="dialog"]',
].join(',');

// Buttons and links activate on Space, but arrows stay free for stepping.
const SPACE_OWNING_SELECTOR = 'button, a[href], [role="button"], [role="switch"]';

function closest(target, selector) {
  return Boolean(target?.closest?.(selector));
}

/**
 * Space plays or pauses, arrows step one frame, Shift+arrows jump between input
 * trees. Ignored while a focused control owns the key or a modifier is held.
 */
export function resolvePlaybackShortcut(event) {
  if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return null;
  if (closest(event.target, KEY_OWNING_SELECTOR)) return null;

  if (event.key === ' ' && !event.shiftKey) {
    return closest(event.target, SPACE_OWNING_SELECTOR) ? null : PLAYBACK_SHORTCUTS.TOGGLE;
  }
  if (event.key === 'ArrowRight') {
    return event.shiftKey ? PLAYBACK_SHORTCUTS.NEXT_INPUT_TREE : PLAYBACK_SHORTCUTS.NEXT_FRAME;
  }
  if (event.key === 'ArrowLeft') {
    return event.shiftKey
      ? PLAYBACK_SHORTCUTS.PREVIOUS_INPUT_TREE
      : PLAYBACK_SHORTCUTS.PREVIOUS_FRAME;
  }
  return null;
}

function runPlaybackShortcut(shortcut) {
  const state = useAppStore.getState();
  switch (shortcut) {
    case PLAYBACK_SHORTCUTS.TOGGLE:
      if (selectPlaying(state)) selectStopAnimationPlayback(state)();
      else Promise.resolve(selectStartAnimationPlayback(state)()).catch(() => {});
      break;
    case PLAYBACK_SHORTCUTS.NEXT_FRAME:
      selectForward(state)();
      break;
    case PLAYBACK_SHORTCUTS.PREVIOUS_FRAME:
      selectBackward(state)();
      break;
    case PLAYBACK_SHORTCUTS.NEXT_INPUT_TREE:
      selectStopAnimationPlayback(state)();
      selectGoToNextInputTree(state)();
      break;
    case PLAYBACK_SHORTCUTS.PREVIOUS_INPUT_TREE:
      selectStopAnimationPlayback(state)();
      selectGoToPreviousInputTree(state)();
      break;
    default:
  }
}

export function usePlaybackShortcuts(enabled) {
  useEffect(() => {
    if (!enabled) return undefined;

    const handleKeyDown = (event) => {
      const shortcut = resolvePlaybackShortcut(event);
      if (!shortcut) return;
      event.preventDefault();
      runPlaybackShortcut(shortcut);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled]);
}
