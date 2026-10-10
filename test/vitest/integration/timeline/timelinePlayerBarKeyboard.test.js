// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
// Static, so the load of the whole player bar counts against the collection, not a test's timeout
import { MoviePlayerBar } from '../../../../src/components/movie-player/MoviePlayerBar.jsx';
import { TooltipProvider } from '../../../../src/components/ui/tooltip';
import { useAppStore } from '../../../../src/state/phyloStore/store.js';

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

describe('player bar timeline interactions', () => {
  const segments = [
    { isInputTreeSegment: true, originalTreeIndex: 0 },
    {
      isInputTreeSegment: false,
      pairId: 'pair_0_1',
      pairOrdinal: 0,
      sourceInputTreeIndex: 0,
      targetInputTreeIndex: 1,
      sourceGlobalIndex: 0,
      targetGlobalIndex: 10,
    },
    { isInputTreeSegment: true, originalTreeIndex: 1 },
  ];
  let root;
  afterEach(() => {
    act(() => root?.unmount());
    document.body.innerHTML = '';
  });

  async function inspectButton({ selected = null, playheadSegment }) {
    useAppStore.setState({
      timeline: { segments },
      selectedTimelineSegmentIndex: selected,
      timelineCursor: { segmentIndex: playheadSegment, frameIndex: 0, movieTimeMs: 0 },
      pairChanges: { maxRf: 0, byPairId: new Map() },
      hoveredSegment: null,
      playing: false,
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

  async function hoverPreview() {
    await inspectButton({ playheadSegment: 0 });
    await act(async () => useAppStore.getState().setHoveredSegment({ index: 0, x: 100 }));
    const preview = document.querySelector('[data-slot="tooltip-content"]');
    expect(preview.textContent).toContain('Input tree 1');
    return preview;
  }

  it('dismisses the hover preview with Escape when no segment is selected', async () => {
    await hoverPreview();

    await act(async () =>
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    );

    expect(document.querySelector('[data-slot="tooltip-content"]')).toBeNull();
    expect(useAppStore.getState().hoveredSegment).toBeNull();
  });

  it.each(['mouse', 'touch'])(
    'clears active and retained previews when a %s gesture starts on the timeline',
    async (pointerType) => {
      const preview = await hoverPreview();
      await act(async () =>
        preview.dispatchEvent(
          new PointerEvent('pointerover', { bubbles: true, pointerType: 'mouse' })
        )
      );

      const strip = document.querySelector('.timeline-visual-layer');
      await act(async () =>
        strip.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType }))
      );

      expect(useAppStore.getState().hoveredSegment).toBeNull();
      expect(document.querySelector('[data-slot="tooltip-content"]')).toBeNull();

      await act(async () =>
        strip.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerType }))
      );
      expect(document.querySelector('[data-slot="tooltip-content"]')).toBeNull();

      await act(async () => useAppStore.getState().setHoveredSegment({ index: 2, x: 300 }));
      expect(document.querySelector('[data-slot="tooltip-content"]').textContent).toContain(
        'Input tree 2'
      );
    }
  );

  it('dismisses the preview on the first Escape even when a status tooltip opened after it', async () => {
    const preview = await hoverPreview();
    preview.getBoundingClientRect = () => ({ left: 80, right: 280, top: 40, bottom: 120 });
    document.querySelector('.interpolation-timeline-container').getBoundingClientRect = () => ({
      top: 200,
    });
    const statusTrigger = document.querySelector(
      '[aria-label="Movie timeline status"] [data-slot="tooltip-trigger"]'
    );
    await act(async () =>
      statusTrigger.dispatchEvent(
        new PointerEvent('pointermove', {
          bubbles: true,
          pointerType: 'mouse',
          clientX: 100,
          clientY: 160,
        })
      )
    );
    expect(document.querySelectorAll('[data-slot="tooltip-content"]')).toHaveLength(2);

    await act(async () =>
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    );

    expect(preview.isConnected).toBe(false);
    expect(useAppStore.getState().hoveredSegment).toBeNull();
  });

  it('keeps the preview while its content is hovered after the pointer leaves the strip', async () => {
    const preview = await hoverPreview();
    await act(async () =>
      preview.dispatchEvent(
        new PointerEvent('pointerover', { bubbles: true, pointerType: 'mouse' })
      )
    );
    await act(async () => useAppStore.getState().setHoveredSegment(null));

    expect(preview.isConnected).toBe(true);
    expect(preview.textContent).toContain('Input tree 1');

    await act(async () =>
      preview.dispatchEvent(
        new PointerEvent('pointerout', {
          bubbles: true,
          pointerType: 'mouse',
          relatedTarget: document.body,
          clientX: 1000,
          clientY: 1000,
        })
      )
    );
    expect(document.querySelector('[data-slot="tooltip-content"]')).toBeNull();
  });

  it.each([100, 350])(
    'keeps a slow pointer from strip x=%s on its way to the preview',
    async (x) => {
      const preview = await hoverPreview();
      preview.getBoundingClientRect = () => ({ left: 80, right: 280, top: 40, bottom: 120 });
      document.querySelector('.interpolation-timeline-container').getBoundingClientRect = () => ({
        top: 200,
      });

      await act(async () =>
        document.querySelector('.interpolation-timeline-container').dispatchEvent(
          new PointerEvent('pointermove', {
            bubbles: true,
            pointerType: 'mouse',
            clientX: x,
            clientY: 210,
          })
        )
      );

      await act(async () =>
        document.dispatchEvent(
          new PointerEvent('pointermove', {
            bubbles: true,
            pointerType: 'mouse',
            clientX: x,
            clientY: 160,
          })
        )
      );
      // The strip's 150 ms leave timer can expire before a slow pointer reaches the preview.
      await act(async () => useAppStore.getState().setHoveredSegment(null));
      expect(preview.isConnected).toBe(true);

      await act(async () =>
        document.dispatchEvent(
          new PointerEvent('pointermove', {
            bubbles: true,
            pointerType: 'mouse',
            clientX: 400,
            clientY: 160,
          })
        )
      );
      expect(document.querySelector('[data-slot="tooltip-content"]')).toBeNull();
    }
  );

  for (const state of [{ playing: true }, { selectedTimelineSegmentIndex: 1 }]) {
    it(`clears a held preview when ${Object.keys(state)[0]} changes`, async () => {
      const preview = await hoverPreview();
      await act(async () =>
        preview.dispatchEvent(
          new PointerEvent('pointerover', { bubbles: true, pointerType: 'mouse' })
        )
      );
      await act(async () => useAppStore.getState().setHoveredSegment(null));
      await act(async () => useAppStore.setState(state));

      expect(document.querySelector('[data-slot="tooltip-content"]')).toBeNull();
    });
  }
});

describe('timeline strip focus ring', () => {
  const css = readRepoFile('src', 'css', 'movie-timeline', 'container.css');
  const ring = css.match(/\[role='slider'\]:focus-visible\s*{([^}]*)}/)[1];

  it('is the ink (--foreground), so the cyan --ring stays for the playhead and the controls', () => {
    expect(ring).toMatch(/outline:\s*2px solid var\(--foreground\)/);
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
