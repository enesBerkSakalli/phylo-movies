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
      'Input trees',
      'Generated frames',
      'Selected segment',
    ]);
    expect(TIMELINE_LEGEND_ITEMS).not.toHaveProperty('currentPosition');
  });

  it('renders an explicit timeline loading state before the manager mounts', () => {
    expect(MOVIE_PLAYER_ARIA_LABELS.loadingTimeline).toBe('Loading movie timeline...');
  });

  it('separates movie transport actions from comparison view actions', () => {
    expect(TRANSPORT_CONTROL_GROUP_LABELS).toEqual({
      root: 'Playback and comparison controls',
      playback: 'Movie playback controls',
      comparison: 'Comparison view controls',
      pinnedTree: 'Pinned reference tree controls',
    });
  });

  it('keeps the timeline viewport toolbar component present', () => {
    const playerBarSource = readRepoFile('src', 'components', 'movie-player', 'MoviePlayerBar.jsx');
    const toolbarSource = readRepoFile(
      'src',
      'components',
      'movie-player',
      'TimelineScrollControls',
      'TimelineScrollControls.jsx'
    );
    const toolbarPath = join(
      repoRoot,
      'src',
      'components',
      'movie-player',
      'TimelineScrollControls',
      'TimelineScrollControls.jsx'
    );

    expect(existsSync(toolbarPath)).toBe(true);
    expect(playerBarSource).toContain('TimelineScrollControls');
    expect(playerBarSource).toContain('MOVIE_PLAYER_ARIA_LABELS.timelineTrack');
    // View controls sit in the footer row under the track, in one quiet style.
    expect(playerBarSource.indexOf('<TimelineScrollControls />')).toBeGreaterThan(
      playerBarSource.indexOf('className="interpolation-timeline-container"')
    );
    expect(toolbarSource).toContain('TIMELINE_VIEW_BUTTON_CLASS');
    expect(toolbarSource).not.toContain('TIMELINE_ZOOM_BUTTON_CLASS');
    expect(toolbarSource).not.toContain('opacity-45');
    expect(toolbarSource).not.toContain('hover:opacity-100');
    expect(toolbarSource).not.toContain('focus-within:opacity-100');
  });

  it('renders timeline status in the movie player instead of the floating HUD', () => {
    const playerBarSource = readRepoFile('src', 'components', 'movie-player', 'MoviePlayerBar.jsx');
    const managerSource = readRepoFile('src', 'timeline', 'core', 'MovieTimelineManager.js');
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
    // One row from lg up (status strip takes the remaining width, transport centred
    // from xl); below lg the status strip takes its own row and the controls wrap.
    expect(playerBarSource).toContain('flex flex-wrap items-center gap-x-2 gap-y-1');
    expect(playerBarSource).toContain(
      'lg:grid lg:grid-cols-[minmax(0,1fr)_auto_auto] xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]'
    );
    expect(playerBarSource).toContain('basis-full items-center gap-1 lg:basis-auto');
    expect(playerBarSource).toContain('ml-auto flex min-w-0 flex-wrap');
    expect(managerSource).toContain('getTimelineStatusSnapshot');
    expect(managerSource).toContain('buildTimelineStatusSnapshot');
    expect(statusStripSource).toContain('selectMovieTimelineManager');
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
    expect(statusStripSource).toContain('getTimelineStatusSnapshot');
    expect(statusStripSource).toContain('buildTimelineStatusSnapshot');
    expect(statusStripSource).toContain('Movie timeline status');
    expect(statusStripSource).toContain('flex-nowrap overflow-hidden');
    expect(statusStripSource).toContain('<StatusItem icon={Film} label="Cursor">');
    expect(statusStripSource).toContain(
      'inline-flex w-auto max-w-[30vw] shrink-0 items-center cursor-help sm:w-[12rem]'
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
    const timelineStatusPosition = playerBarSource.indexOf('<TimelineStatusStrip />');
    const msaActionPosition = playerBarSource.indexOf('<MsaPlayerBarAction');
    const motionStagePosition = playerBarSource.indexOf('<MotionStageLabel />');
    const playbackSettingsPosition = playerBarSource.indexOf(
      'aria-label={MOVIE_PLAYER_ARIA_LABELS.playbackSettings}'
    );

    expect(timelineStatusPosition).toBeLessThan(msaActionPosition);
    expect(msaActionPosition).toBeLessThan(motionStagePosition);
    expect(motionStagePosition).toBeLessThan(playbackSettingsPosition);
  });

  it('puts legend, timeline view controls, and metrics in one footer row', () => {
    const playerBarSource = readRepoFile('src', 'components', 'movie-player', 'MoviePlayerBar.jsx');
    expect(playerBarSource).toContain('aria-label={MOVIE_PLAYER_ARIA_LABELS.timelineFooter}');
    expect(playerBarSource).not.toContain('TimelineLayerControls');
    const footerPosition = playerBarSource.indexOf('MOVIE_PLAYER_ARIA_LABELS.timelineFooter');
    expect(playerBarSource.indexOf('<MovieChartSection />')).toBeGreaterThan(footerPosition);
    expect(playerBarSource.indexOf('<TimelineScrollControls />')).toBeGreaterThan(footerPosition);
  });

  it('isolates high-frequency timeline and chart state from the player shell', () => {
    const playerBarSource = readRepoFile('src', 'components', 'movie-player', 'MoviePlayerBar.jsx');
    const chartSectionSource = readRepoFile(
      'src',
      'components',
      'movie-player',
      'MovieChartSection',
      'MovieChartSection.jsx'
    );
    const distanceChartSource = readRepoFile(
      'src',
      'components',
      'DistanceChart',
      'DistanceChart.jsx'
    );

    expect(playerBarSource).toContain('<TimelineSegmentTooltipOverlay />');
    expect(playerBarSource).toContain('<MovieChartSection />');
    expect(playerBarSource).not.toContain(
      '<MovieChartSection barOptionValue={barOptionValue} onBarOptionChange={setBarOption} />'
    );
    expect(chartSectionSource).toContain(
      'export const MovieChartSection = React.memo(MovieChartSectionComponent)'
    );
    expect(chartSectionSource).toContain('aria-describedby="chart-select-help"');
    expect(chartSectionSource).toContain('const DistanceChart = React.lazy(loadDistanceChart)');
    expect(chartSectionSource).toContain('aria-expanded={chartExpanded}');
    expect(chartSectionSource).toContain('chartExpanded ? (');
    expect(distanceChartSource).toContain('sourceFrameIndex: cursor?.sourceFrameIndex ?? null');
    expect(distanceChartSource).toContain(
      'sourceInputTreeIndex: cursor?.sourceInputTreeIndex ?? null'
    );
    expect(distanceChartSource).not.toContain('timelineCursor: selectTimelineCursor(state)');
  });
});
