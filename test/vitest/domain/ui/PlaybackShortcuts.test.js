// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  playbackCommands,
  resolvePlaybackShortcut,
  usePlaybackShortcuts,
} from '../../../../src/components/movie-player/playbackShortcuts.js';
import { attachTimelineInput } from '../../../../src/timeline/timelineInput.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

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
    const slider = document.createElement('span'); // a speed slider's thumb: it owns the arrows
    slider.setAttribute('role', 'slider');
    for (const target of [input, slider]) {
      expect(resolvePlaybackShortcut(keyEvent('ArrowRight', { target }))).toBeNull();
      expect(resolvePlaybackShortcut(keyEvent(' ', { target }))).toBeNull();
    }
  });

  it('leaves the arrows to a focused canvas, which pans with them, but not Space', () => {
    const canvas = document.createElement('canvas');
    expect(resolvePlaybackShortcut(keyEvent('ArrowRight', { target: canvas }))).toBeNull();
    expect(
      resolvePlaybackShortcut(keyEvent('ArrowLeft', { target: canvas, shiftKey: true }))
    ).toBeNull();
    expect(resolvePlaybackShortcut(keyEvent(' ', { target: canvas }))).toBe('toggle');
  });

  it('gives the timeline strip the same keys as the rest of the app', () => {
    const strip = document.createElement('div');
    strip.setAttribute('role', 'slider');
    strip.setAttribute('data-playback-keys', '');
    const resolve = (key, shiftKey) =>
      resolvePlaybackShortcut(keyEvent(key, { target: strip, shiftKey }));

    expect(resolve(' ')).toBe('toggle');
    expect(resolve('ArrowRight')).toBe('nextFrame');
    expect(resolve('ArrowLeft')).toBe('previousFrame');
    expect(resolve('ArrowRight', true)).toBe('nextInputTree');
    expect(resolve('ArrowLeft', true)).toBe('previousInputTree');
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

  describe('with the timeline strip listening too', () => {
    const roots = [];
    afterEach(() => {
      act(() => roots.forEach((root) => root.unmount()));
      roots.length = 0;
      document.body.innerHTML = '';
      vi.restoreAllMocks();
    });

    // The window listener the app installs, and the strip's own keys on a wrapper like the view's
    async function mountStrip() {
      function Shortcuts() {
        usePlaybackShortcuts(true);
        return null;
      }
      const host = document.createElement('div');
      document.body.appendChild(host);
      const root = createRoot(host);
      roots.push(root);
      await act(async () => root.render(React.createElement(Shortcuts)));

      const wrapper = document.createElement('div');
      wrapper.setAttribute('role', 'slider');
      wrapper.setAttribute('data-playback-keys', '');
      wrapper.appendChild(document.createElement('canvas'));
      document.body.appendChild(wrapper);
      const callbacks = {
        onScrub: vi.fn(),
        onSelect: vi.fn(),
        onHover: vi.fn(),
        onInspect: vi.fn(),
      };
      attachTimelineInput({ timeline: { segments: [], steps: [] }, canvas: wrapper }, callbacks);
      return { wrapper, callbacks };
    }

    const press = (target, key, init = {}) => {
      const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key, ...init });
      target.dispatchEvent(event);
      return event;
    };

    it('plays or pauses once on Space, from the strip and from a canvas', async () => {
      const { wrapper } = await mountStrip();
      const toggle = vi.spyOn(playbackCommands, 'toggle').mockImplementation(() => {});

      expect(press(wrapper, ' ').defaultPrevented).toBe(true);
      expect(toggle).toHaveBeenCalledTimes(1);

      press(wrapper.querySelector('canvas'), ' ');
      expect(toggle).toHaveBeenCalledTimes(2);

      const tree = document.createElement('canvas');
      document.body.appendChild(tree);
      press(tree, ' ');
      expect(toggle).toHaveBeenCalledTimes(3);
    });

    it('steps once on an arrow key from the strip, and selects nothing', async () => {
      const { wrapper, callbacks } = await mountStrip();
      const nextFrame = vi.spyOn(playbackCommands, 'nextFrame').mockImplementation(() => {});
      const nextInputTree = vi
        .spyOn(playbackCommands, 'nextInputTree')
        .mockImplementation(() => {});

      press(wrapper, 'ArrowRight');
      press(wrapper, 'ArrowRight', { shiftKey: true });

      expect(nextFrame).toHaveBeenCalledTimes(1);
      expect(nextInputTree).toHaveBeenCalledTimes(1);
      expect(callbacks.onSelect).not.toHaveBeenCalled();
    });
  });
});
