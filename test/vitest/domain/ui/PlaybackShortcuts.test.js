// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import {
  PLAYBACK_SHORTCUTS,
  resolvePlaybackShortcut,
} from '../../../../src/components/movie-player/playbackShortcuts.js';

function keyEvent(key, { target = document.body, ...modifiers } = {}) {
  return { key, target, defaultPrevented: false, ...modifiers };
}

describe('movie playback keyboard shortcuts', () => {
  it('maps Space and the arrow keys to playback actions', () => {
    expect(resolvePlaybackShortcut(keyEvent(' '))).toBe(PLAYBACK_SHORTCUTS.TOGGLE);
    expect(resolvePlaybackShortcut(keyEvent('ArrowRight'))).toBe(PLAYBACK_SHORTCUTS.NEXT_FRAME);
    expect(resolvePlaybackShortcut(keyEvent('ArrowLeft'))).toBe(PLAYBACK_SHORTCUTS.PREVIOUS_FRAME);
    expect(resolvePlaybackShortcut(keyEvent('ArrowRight', { shiftKey: true }))).toBe(
      PLAYBACK_SHORTCUTS.NEXT_INPUT_TREE
    );
    expect(resolvePlaybackShortcut(keyEvent('ArrowLeft', { shiftKey: true }))).toBe(
      PLAYBACK_SHORTCUTS.PREVIOUS_INPUT_TREE
    );
    expect(resolvePlaybackShortcut(keyEvent('a'))).toBeNull();
  });

  it('leaves keys to focused controls that own them', () => {
    const input = document.createElement('input');
    const slider = document.createElement('span');
    slider.setAttribute('role', 'slider');
    const canvas = document.createElement('canvas');
    for (const target of [input, slider, canvas]) {
      expect(resolvePlaybackShortcut(keyEvent('ArrowRight', { target }))).toBeNull();
      expect(resolvePlaybackShortcut(keyEvent(' ', { target }))).toBeNull();
    }
  });

  it('lets buttons keep Space but still steps frames with arrows', () => {
    const button = document.createElement('button');
    expect(resolvePlaybackShortcut(keyEvent(' ', { target: button }))).toBeNull();
    expect(resolvePlaybackShortcut(keyEvent('ArrowRight', { target: button }))).toBe(
      PLAYBACK_SHORTCUTS.NEXT_FRAME
    );
  });

  it('ignores modified and already-handled keys', () => {
    expect(resolvePlaybackShortcut(keyEvent('ArrowRight', { metaKey: true }))).toBeNull();
    expect(resolvePlaybackShortcut(keyEvent(' ', { defaultPrevented: true }))).toBeNull();
  });
});
