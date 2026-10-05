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

/** The playback commands, shared by the transport buttons and the keyboard shortcuts. */
export const playbackCommands = {
  toggle() {
    const state = useAppStore.getState();
    if (selectPlaying(state)) selectStopAnimationPlayback(state)();
    else selectStartAnimationPlayback(state)().catch(() => {});
  },
  nextFrame: () => selectForward(useAppStore.getState())(),
  previousFrame: () => selectBackward(useAppStore.getState())(),
  nextInputTree() {
    const state = useAppStore.getState();
    selectStopAnimationPlayback(state)();
    selectGoToNextInputTree(state)();
  },
  previousInputTree() {
    const state = useAppStore.getState();
    selectStopAnimationPlayback(state)();
    selectGoToPreviousInputTree(state)();
  },
};

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
 * The playbackCommands key for a key press: Space plays or pauses, arrows step one
 * frame, Shift+arrows jump between input trees. Null while a focused control owns the
 * key or a modifier is held.
 */
export function resolvePlaybackShortcut(event) {
  if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return null;
  if (closest(event.target, KEY_OWNING_SELECTOR)) return null;

  if (event.key === ' ' && !event.shiftKey) {
    return closest(event.target, SPACE_OWNING_SELECTOR) ? null : 'toggle';
  }
  if (event.key === 'ArrowRight') {
    return event.shiftKey ? 'nextInputTree' : 'nextFrame';
  }
  if (event.key === 'ArrowLeft') {
    return event.shiftKey ? 'previousInputTree' : 'previousFrame';
  }
  return null;
}

export function usePlaybackShortcuts(enabled) {
  useEffect(() => {
    if (!enabled) return undefined;

    const handleKeyDown = (event) => {
      const command = resolvePlaybackShortcut(event);
      if (!command) return;
      event.preventDefault();
      playbackCommands[command]();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled]);
}
