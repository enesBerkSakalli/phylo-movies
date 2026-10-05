import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const repoRoot = process.cwd();

function readRepoFile(...segments) {
  return readFileSync(join(repoRoot, ...segments), 'utf8');
}

describe('movie timeline player bar semantics', () => {
  it('keeps the legend aligned with visible timeline states', () => {
    const playerBarSource = readRepoFile('src', 'components', 'movie-player', 'MoviePlayerBar.jsx');
    const legendSource = playerBarSource.slice(playerBarSource.indexOf('function TimelineLegend'));

    expect([...legendSource.matchAll(/\slabel="([^"]+)"/g)].map((match) => match[1])).toEqual([
      'RF change',
      'SPR move',
      'Branch lengths only',
      'Input tree',
      'Selected',
      'Playhead',
    ]);
  });

  it('renders an explicit timeline loading state before the manager mounts', () => {
    const playerBarSource = readRepoFile('src', 'components', 'movie-player', 'MoviePlayerBar.jsx');

    expect(playerBarSource).toContain('Loading movie timeline...');
  });

  it('labels the playback transport and the pinned reference tree control', () => {
    const transportSource = readRepoFile(
      'src',
      'components',
      'movie-player',
      'TransportControls.jsx'
    );
    const pinnedSource = readRepoFile('src', 'components', 'movie-player', 'PinnedTreeControl.jsx');

    expect(transportSource).toContain('aria-label="Movie playback controls"');
    expect(pinnedSource).toContain('aria-label="Pinned reference tree controls"');
  });

  it('keeps comparison and the pinned tree out of the transport, in Settings > View', () => {
    const transportSource = readRepoFile(
      'src',
      'components',
      'movie-player',
      'TransportControls.jsx'
    );
    const viewModeSource = readRepoFile('src', 'components', 'appearance', 'ViewModeSection.jsx');

    for (const moved of ['PinnedTreeControl', 'ComparisonMode', 'ViewsConnected', 'GitCompare']) {
      expect(transportSource).not.toContain(moved);
    }
    expect(viewModeSource).toContain('<PinnedTreeControl />');
    expect(viewModeSource).toContain('selectToggleComparisonMode');
    expect(viewModeSource).toContain("'Hide comparison view' : 'Show comparison view'");
    expect(viewModeSource).toContain("'Unlink tree views' : 'Link tree views'");
  });

  it('puts zoom, fit, and the legend beside the timeline track, with no scroll-to-end buttons', () => {
    const playerBarSource = readRepoFile('src', 'components', 'movie-player', 'MoviePlayerBar.jsx');
    const toolbarSource = readRepoFile(
      'src',
      'components',
      'movie-player',
      'TimelineScrollControls',
      'TimelineScrollControls.jsx'
    );

    expect(playerBarSource).toContain('aria-label="Timeline track"');
    const trackPosition = playerBarSource.indexOf('aria-label="Timeline track"');
    expect(playerBarSource.indexOf('<TimelineScrollControls />')).toBeGreaterThan(trackPosition);
    expect(playerBarSource.indexOf('<TimelineLegend')).toBeGreaterThan(trackPosition);
    for (const id of ['zoomOutBtn', 'fitToWindowBtn', 'zoomInBtn']) {
      expect(toolbarSource).toContain(id);
    }
    // Home and End on the strip already jump to the ends.
    for (const gone of ['scrollToStart', 'scrollToEnd', 'ChevronsLeft', 'ChevronsRight']) {
      expect(toolbarSource).not.toContain(gone);
    }
    expect(toolbarSource).toContain('TIMELINE_VIEW_BUTTON_CLASS');
    expect(toolbarSource).not.toContain('opacity-45');
  });

  it('is two rows: transport and status above, the timeline strip below', () => {
    const playerBarSource = readRepoFile('src', 'components', 'movie-player', 'MoviePlayerBar.jsx');

    for (const gone of [
      'toolbarExpanded',
      'ChevronUp',
      'ChevronDown',
      'MovieChartSection',
      'timelineFooter',
    ]) {
      expect(playerBarSource).not.toContain(gone);
    }
    expect(playerBarSource.indexOf('aria-label="Primary playback controls"')).toBeLessThan(
      playerBarSource.indexOf('aria-label="Timeline track"')
    );
    // Row 1 stays on one line from lg up and wraps below it; nothing is a grid any more.
    expect(playerBarSource).toContain('flex flex-wrap items-center gap-x-2 gap-y-1');
    expect(playerBarSource).toContain('lg:flex-nowrap');
    expect(playerBarSource).not.toContain('lg:grid');
  });

  it('keeps row 1 to the menu, transport and position below sm, the rest in a More popover', () => {
    const playerBarSource = readRepoFile('src', 'components', 'movie-player', 'MoviePlayerBar.jsx');
    const moreMenu = playerBarSource.slice(
      playerBarSource.indexOf('function MoreMenu'),
      playerBarSource.indexOf('function TimelineLegend')
    );

    // Tailwind's sm is 40rem; the layout switches where the sm: classes do
    expect(playerBarSource).toContain('(max-width: 39.99rem)');
    expect(playerBarSource).toContain('aria-label="More playback and timeline options"');
    expect(playerBarSource).toContain('Ellipsis');
    // Speed, zoom, the two actions and the legend all live in it, once
    for (const control of [
      '<PlaybackSpeedControl',
      '<TimelineScrollControls',
      '<InspectTransitionAction',
      '<MsaPlayerBarAction',
      '<LegendItems',
    ]) {
      expect(moreMenu).toContain(control);
    }
    // The position gets its own line, the strip its own row
    expect(playerBarSource).toContain('basis-full');
  });

  it('gives the visible buttons 44px touch targets below sm and leaves desktop sizes alone', () => {
    const read = (...segments) => readRepoFile('src', 'components', 'movie-player', ...segments);
    const sources = [
      read('MoviePlayerBar.jsx'),
      read('TransportControls.jsx'),
      read('TimelineScrollControls', 'TimelineScrollControls.jsx'),
    ];

    for (const source of sources) expect(source).toContain('max-sm:size-[44px]');
    // Desktop sizes are the same classes as before
    expect(read('TransportControls.jsx')).toContain('size="icon"');
    expect(read('TimelineScrollControls', 'TimelineScrollControls.jsx')).toContain('size-7');
  });

  it('renders timeline status in the movie player instead of the floating HUD', () => {
    const playerBarSource = readRepoFile('src', 'components', 'movie-player', 'MoviePlayerBar.jsx');
    const statusStripPath = join(
      repoRoot,
      'src',
      'components',
      'movie-player',
      'TimelineStatusStrip.jsx'
    );
    const statusStripSource = existsSync(statusStripPath)
      ? readFileSync(statusStripPath, 'utf8')
      : '';

    expect(existsSync(statusStripPath)).toBe(true);
    expect(playerBarSource).toContain('TimelineStatusStrip');
    expect(playerBarSource).toContain('selectOpenMsaViewer');
    expect(playerBarSource).toContain('Open alignment viewer');
    expect(playerBarSource).toContain('ml-auto');
    expect(playerBarSource).toContain('selectCurrentAnimationStage');
    // The transition stage lives in its own component next to the status strip,
    // so stage updates during playback never re-render the strip.
    expect(playerBarSource).toContain('<MotionStageLabel />');
    expect(playerBarSource).toContain(
      'function MotionStageLabel() {\n  const stage = useAppStore(selectCurrentAnimationStage);'
    );
    expect(playerBarSource).not.toContain('MotionStatusSlot');
    expect(statusStripSource).not.toContain('selectCurrentAnimationStage');
    expect(statusStripSource).not.toContain('AnimationStageStatus');
    expect(statusStripSource).toContain('describeCursor');
    expect(statusStripSource).toContain('Movie timeline status');
    expect(statusStripSource).toContain('flex-nowrap overflow-hidden');
    // The position text stands alone: no "Cursor" label chip in front of it.
    expect(statusStripSource).not.toContain('Film');
    expect(statusStripSource).not.toContain('label="Cursor"');
    // On a phone the position has a line to itself, never cut mid-number, in its short form.
    expect(statusStripSource).toContain(
      'inline-flex w-auto shrink-0 items-center cursor-help sm:w-[14rem]'
    );
    expect(statusStripSource).toContain('position?.short ??');
    expect(statusStripSource).toContain('sm:hidden');
    expect(statusStripSource).toContain('inline-flex w-[6.5rem] shrink-0');
    expect(statusStripSource).toContain('hidden w-[7rem] shrink-0');
    expect(statusStripSource).toContain('xl:inline-flex');
    expect(statusStripSource).toContain(
      "Window size ${msaWindowSize ?? '-'} / Step size ${msaStepSize ?? '-'}"
    );
    expect(statusStripSource).toContain("W ${msaWindowSize ?? '-'} / S ${msaStepSize ?? '-'}");
    // One flat strip: no bordered chips inside it.
    expect(statusStripSource).not.toContain('border-primary/20 bg-primary/10');
    expect(statusStripSource).not.toContain('Tree Type');
    expect(statusStripSource).not.toContain('Badge');
    // Row 1 reads: settings, transport, position + stage, inspect, alignment, speed.
    const order = [
      'id="nav-toggle-button"',
      '<TransportControls',
      '<TimelineStatusStrip />',
      '<MotionStageLabel />',
      '<InspectTransitionAction',
      '<MsaPlayerBarAction',
      'aria-label="Playback settings"',
      '<PlaybackSpeedControl',
    ].map((marker) => playerBarSource.indexOf(marker));

    expect(order.every((position) => position >= 0)).toBe(true);
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  it('draws the legend swatches the strip uses, with the dataset RF maximum', () => {
    const playerBarSource = readRepoFile('src', 'components', 'movie-player', 'MoviePlayerBar.jsx');
    // The pair changes are built once into the store, not per component.
    expect(playerBarSource).toContain('selectPairChanges');
    expect(playerBarSource).not.toContain('buildPairChangeProfile');
    // The legend opens from a (?) button beside the zoom controls instead of taking a row.
    expect(playerBarSource).toContain("from '../ui/popover'");
    expect(playerBarSource).toContain('<PopoverTrigger asChild>');
    expect(playerBarSource).toContain('aria-label="Timeline legend"');
    expect(playerBarSource).toContain('(max {maxRf.toFixed(2)})');
    expect(playerBarSource).toContain('merged per transition (size = moves) when zoomed out');
    // rgb(100,116,139), rgb(51,65,85) and rgb(5,150,105): slate-500, slate-700, emerald-600.
    // rgb(64,128,255), the playhead blue.
    const swatches = ['bg-slate-500', 'bg-slate-700', 'border-slate-500', 'bg-emerald-600'];
    for (const swatch of [...swatches, 'bg-[#4080ff]']) {
      expect(playerBarSource).toContain(swatch);
    }
    expect(playerBarSource).not.toContain('bg-amber-600');
  });

  it('keeps the segment tooltip off the controls and out of the pointer path', () => {
    const playerBarSource = readRepoFile('src', 'components', 'movie-player', 'MoviePlayerBar.jsx');
    const tooltipSource = readRepoFile(
      'src',
      'components',
      'timeline',
      'TimelineSegmentTooltip.jsx'
    );
    // Radix floats it 8px above a point on the bar's top edge and keeps it inside the viewport.
    expect(playerBarSource).toContain('bottom-[var(--movie-player-bar-height)]');
    expect(playerBarSource).toContain('side="top"');
    expect(playerBarSource).toContain('sideOffset={8}');
    expect(playerBarSource).toContain('collisionPadding={8}');
    expect(playerBarSource.match(/pointer-events-none/g)).toHaveLength(2);
    expect(playerBarSource).not.toContain('pointer-events-auto');
    expect(playerBarSource).not.toContain('selectSetTooltipHovered');
    expect(playerBarSource).not.toContain('onMouseLeave');
    expect(tooltipSource).not.toContain('Button');
  });

  it('keeps high-frequency tooltip state out of the player shell and drops the metrics chart', () => {
    const playerBarSource = readRepoFile('src', 'components', 'movie-player', 'MoviePlayerBar.jsx');
    const timelineSlice = readRepoFile(
      'src',
      'state',
      'phyloStore',
      'slices',
      'playback',
      'treeTimeline.slice.js'
    );

    expect(playerBarSource).toContain('<TimelineSegmentTooltipOverlay');
    for (const removed of [
      ['src', 'components', 'DistanceChart'],
      ['src', 'components', 'movie-player', 'MovieChartSection'],
    ]) {
      expect(existsSync(join(repoRoot, ...removed))).toBe(false);
    }
    expect(timelineSlice).not.toContain('barOptionValue');
    expect(timelineSlice).not.toContain('setBarOption');
  });
});
