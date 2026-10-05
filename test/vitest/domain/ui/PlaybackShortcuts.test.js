// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import {
  playbackCommands,
  resolvePlaybackShortcut,
} from '../../../../src/components/movie-player/playbackShortcuts.js';

function keyEvent(key, { target = document.body, ...modifiers } = {}) {
  return { key, target, defaultPrevented: false, ...modifiers };
}

describe('movie playback keyboard shortcuts', () => {
  it('maps Space and the arrow keys to playback actions', () => {
    expect(resolvePlaybackShortcut(keyEvent(' '))).toBe('toggle');
    expect(resolvePlaybackShortcut(keyEvent('ArrowRight'))).toBe('nextFrame');
    expect(resolvePlaybackShortcut(keyEvent('ArrowLeft'))).toBe('previousFrame');
    expect(resolvePlaybackShortcut(keyEvent('ArrowRight', { shiftKey: true }))).toBe(
      'nextInputTree'
    );
    expect(resolvePlaybackShortcut(keyEvent('ArrowLeft', { shiftKey: true }))).toBe(
      'previousInputTree'
    );
    expect(resolvePlaybackShortcut(keyEvent('a'))).toBeNull();
  });

  it('names a command for every shortcut', () => {
    const commands = [
      keyEvent(' '),
      keyEvent('ArrowRight'),
      keyEvent('ArrowLeft'),
      keyEvent('ArrowRight', { shiftKey: true }),
      keyEvent('ArrowLeft', { shiftKey: true }),
    ].map(resolvePlaybackShortcut);

    expect(commands.every((command) => typeof playbackCommands[command] === 'function')).toBe(true);
    expect(new Set(commands).size).toBe(Object.keys(playbackCommands).length);
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
    expect(resolvePlaybackShortcut(keyEvent('ArrowRight', { target: button }))).toBe('nextFrame');
  });

  it('ignores modified and already-handled keys', () => {
    expect(resolvePlaybackShortcut(keyEvent('ArrowRight', { metaKey: true }))).toBeNull();
    expect(resolvePlaybackShortcut(keyEvent(' ', { defaultPrevented: true }))).toBeNull();
  });
});
