// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
// jsdom has none, and Radix's size hook (tooltips, popovers) needs one
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const openPanel = vi.hoisted(() => vi.fn());
vi.mock('../../../../src/components/dock/dockRuntime.js', () => ({
  openPanel,
  togglePanel: vi.fn(),
  useIsPanelOpen: () => false,
}));
vi.mock('../../../../src/components/dock/panelRegistry.js', () => ({
  SETTINGS_PANEL_ID: 'settings',
}));
vi.mock('../../../../src/timeline/timelineController.js', () => ({
  TimelineController: class {
    mount() {}
    unmount() {}
  },
}));

const readRepoFile = (...segments) => readFileSync(join(process.cwd(), ...segments), 'utf8');

describe('Inspect transition action', () => {
  const roots = [];
  afterEach(() => {
    act(() => roots.forEach((root) => root.unmount()));
    roots.length = 0;
    document.body.innerHTML = '';
    openPanel.mockClear();
  });

  async function render(canInspect) {
    const { InspectTransitionAction } =
      await import('../../../../src/components/movie-player/MoviePlayerBar.jsx');
    const { TooltipProvider } = await import('../../../../src/components/ui/tooltip');
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = createRoot(host);
    roots.push(root);
    await act(async () =>
      root.render(
        React.createElement(
          TooltipProvider,
          null,
          React.createElement(InspectTransitionAction, { canInspect })
        )
      )
    );
    return host.querySelector('button');
  }

  it('opens the inspector when a transition is selected', async () => {
    const button = await render(true);

    expect(button.getAttribute('aria-disabled')).not.toBe('true');
    await act(async () => button.click());

    expect(openPanel).toHaveBeenCalledWith('inspector');
  });

  it('stays focusable when no transition is selected, says why, and does nothing', async () => {
    const button = await render(false);

    expect(button.disabled).toBe(false);
    expect(button.getAttribute('aria-disabled')).toBe('true');
    await act(async () => button.focus());
    expect(document.activeElement).toBe(button);

    const reason = document.getElementById(button.getAttribute('aria-describedby'));
    expect(reason.textContent).toBe('Move to a transition to inspect it');

    await act(async () => button.click());
    expect(openPanel).not.toHaveBeenCalled();
  });
});

describe('Inspect on the player bar', () => {
  const segments = [
    { isInputTreeSegment: true },
    { isInputTreeSegment: false },
    { isInputTreeSegment: true },
  ];
  let root;
  afterEach(() => {
    act(() => root?.unmount());
    document.body.innerHTML = '';
  });

  async function inspectButton({ selected = null, playheadSegment }) {
    const { MoviePlayerBar } =
      await import('../../../../src/components/movie-player/MoviePlayerBar.jsx');
    const { TooltipProvider } = await import('../../../../src/components/ui/tooltip');
    const { useAppStore } = await import('../../../../src/state/phyloStore/store.js');
    useAppStore.setState({
      timeline: { segments },
      selectedTimelineSegmentIndex: selected,
      timelineCursor: { segmentIndex: playheadSegment, frameIndex: 0, movieTimeMs: 0 },
      pairChanges: { maxRf: 0, byPairId: new Map() },
    });
    const host = document.body.appendChild(document.createElement('div'));
    root = createRoot(host);
    await act(async () =>
      root.render(React.createElement(TooltipProvider, null, React.createElement(MoviePlayerBar)))
    );
    return host.querySelector('button[aria-label="Inspect transition"]');
  }

  it('is on while the playhead is inside a transition, with nothing selected', async () => {
    const button = await inspectButton({ playheadSegment: 1 });

    expect(button.getAttribute('aria-disabled')).toBe('false');
  });

  it('is off on an input tree with nothing selected', async () => {
    const button = await inspectButton({ playheadSegment: 2 });

    expect(button.getAttribute('aria-disabled')).toBe('true');
  });

  it('stays on the selected transition after the playhead leaves it', async () => {
    const button = await inspectButton({ selected: 1, playheadSegment: 2 });

    expect(button.getAttribute('aria-disabled')).toBe('false');
  });
});

describe('timeline strip focus ring', () => {
  const css = readRepoFile('src', 'css', 'movie-timeline', 'container.css');
  const ring = css.match(/\[role='slider'\]:focus-visible\s*{([^}]*)}/)[1];

  it("is the app's --ring, the signal at 3.68:1 on white", () => {
    expect(ring).toMatch(/outline:\s*2px solid var\(--ring\)/);
  });

  it('is drawn inside the strip, where no overflow:hidden ancestor can clip it', () => {
    expect(ring).toMatch(/outline-offset:\s*-2px/);
  });

  it('is not also drawn on deck canvas, which holds no focus', () => {
    expect(css).not.toContain('canvas:focus-visible');
  });
});

describe('phone options dialog', () => {
  it('has an accessible name', () => {
    const source = readRepoFile('src', 'components', 'movie-player', 'MoviePlayerBar.jsx');
    const moreMenu = source.slice(
      source.indexOf('function MoreMenu'),
      source.indexOf('function TimelineLegend')
    );

    expect(moreMenu).toMatch(/<PopoverContent[^>]*aria-label="Playback and timeline options"/);
  });
});
