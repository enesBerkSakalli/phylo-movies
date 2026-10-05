import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  MOVIE_PLAYER_ARIA_LABELS,
  TIMELINE_LEGEND_ITEMS,
} from '../../../../src/components/movie-player/MoviePlayerBar.contract.js';
import { TRANSPORT_CONTROL_GROUP_LABELS } from '../../../../src/components/movie-player/TransportControls.contract.js';

const repoRoot = process.cwd();

function readRepoFile(...segments) {
  return readFileSync(join(repoRoot, ...segments), 'utf8');
}

describe('movie timeline player bar semantics', () => {
  it('keeps the legend aligned with visible timeline states', () => {
    expect(Object.values(TIMELINE_LEGEND_ITEMS)).toEqual([
      'RF change',
      'SPR move',
      'Branch lengths only',
      'Input tree',
      'Selected',
    ]);
    expect(TIMELINE_LEGEND_ITEMS).not.toHaveProperty('currentPosition');
  });

  it('renders an explicit timeline loading state before the manager mounts', () => {
    expect(MOVIE_PLAYER_ARIA_LABELS.loadingTimeline).toBe('Loading movie timeline...');
  });

  it('labels the playback transport and the pinned reference tree control', () => {
    expect(TRANSPORT_CONTROL_GROUP_LABELS).toEqual({
      playback: 'Movie playback controls',
      pinnedTree: 'Pinned reference tree controls',
    });
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

    expect(playerBarSource).toContain('MOVIE_PLAYER_ARIA_LABELS.timelineTrack');
    const trackPosition = playerBarSource.indexOf('MOVIE_PLAYER_ARIA_LABELS.timelineTrack');
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

    expect(MOVIE_PLAYER_ARIA_LABELS).not.toHaveProperty('timelineFooter');
    for (const gone of [
      'toolbarExpanded',
      'ChevronUp',
      'ChevronDown',
      'MovieChartSection',
      'timelineFooter',
    ]) {
      expect(playerBarSource).not.toContain(gone);
    }
    expect(playerBarSource.indexOf('MOVIE_PLAYER_ARIA_LABELS.primaryControls')).toBeLessThan(
      playerBarSource.indexOf('MOVIE_PLAYER_ARIA_LABELS.timelineTrack')
    );
    // Row 1 stays on one line from lg up and wraps below it; nothing is a grid any more.
    expect(playerBarSource).toContain('flex flex-wrap items-center gap-x-2 gap-y-1');
    expect(playerBarSource).toContain('lg:flex-nowrap');
    expect(playerBarSource).not.toContain('lg:grid');
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
    expect(statusStripSource).toContain(
      'inline-flex w-auto max-w-[30vw] shrink-0 items-center cursor-help sm:w-[14rem]'
    );
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
      'aria-label={MOVIE_PLAYER_ARIA_LABELS.playbackSettings}',
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
    expect(playerBarSource).toContain('aria-label={MOVIE_PLAYER_ARIA_LABELS.timelineLegend}');
    expect(playerBarSource).toContain('(max {maxRf.toFixed(2)})');
    expect(playerBarSource).toContain('title="size = taxa moved"');
    // rgb(100,116,139), rgb(51,65,85) and rgb(5,150,105): slate-500, slate-700, emerald-600.
    for (const swatch of ['bg-slate-500', 'bg-slate-700', 'border-slate-500', 'bg-emerald-600']) {
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
    expect(playerBarSource).toContain("pointerEvents: 'none'");
    expect(playerBarSource).not.toContain("pointerEvents: 'auto'");
    expect(playerBarSource).not.toContain('selectSetTooltipHovered');
    expect(playerBarSource).not.toContain('onMouseLeave');
    expect(playerBarSource).toContain('playerBarRef.current.getBoundingClientRect().top');
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
