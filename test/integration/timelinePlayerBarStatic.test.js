import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  MOVIE_PLAYER_ARIA_LABELS,
  TIMELINE_LEGEND_ITEMS,
} from '../../src/components/movie-player/MoviePlayerBar.contract.js';
import { TRANSPORT_CONTROL_GROUP_LABELS } from '../../src/components/movie-player/TransportControls.contract.js';

const repoRoot = dirname(dirname(dirname(fileURLToPath(import.meta.url))));

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
    expect(playerBarSource).toContain('<TimelineLayerControls');
    expect(playerBarSource.indexOf('<TimelineLayerControls')).toBeLessThan(
      playerBarSource.indexOf('className="interpolation-timeline-container"')
    );
    expect(playerBarSource).toContain('<TimelineScrollControls />');
    expect(toolbarSource).toContain('TIMELINE_ZOOM_BUTTON_CLASS');
    expect(toolbarSource).toContain('bg-background/85');
    expect(toolbarSource).toContain('border border-border/50');
    expect(toolbarSource).toContain('hover:bg-primary/10');
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
    expect(playerBarSource).toContain('grid-cols-[minmax(0,1fr)_auto] items-center gap-2');
    expect(playerBarSource).toContain('lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]');
    expect(playerBarSource).toContain('col-span-2 flex min-w-0 flex-wrap');
    expect(playerBarSource).toContain('lg:col-span-1');
    expect(managerSource).toContain('getTimelineStatusSnapshot');
    expect(managerSource).toContain('buildTimelineStatusSnapshot');
    expect(statusStripSource).toContain('selectMovieTimelineManager');
    expect(playerBarSource).toContain('selectCurrentAnimationStage');
    expect(playerBarSource).toContain('MotionStatusSlot');
    expect(playerBarSource).toContain('data-motion-status="stable"');
    expect(playerBarSource).toContain('No topology-change motion is active.');
    expect(statusStripSource).not.toContain('selectCurrentAnimationStage');
    expect(statusStripSource).not.toContain('AnimationStageStatus');
    expect(statusStripSource).toContain('getTimelineStatusSnapshot');
    expect(statusStripSource).toContain('buildTimelineStatusSnapshot');
    expect(statusStripSource).toContain('Movie timeline status');
    expect(statusStripSource).toContain('flex-nowrap overflow-hidden');
    expect(statusStripSource).toContain('border-border/40 bg-muted/20 backdrop-blur-sm');
    expect(statusStripSource).toContain('text-xs font-bold leading-tight tracking-tight uppercase');
    expect(statusStripSource).toContain(
      'text-[10px] text-muted-foreground/80 leading-tight font-medium'
    );
    expect(statusStripSource).toContain('<StatusItem icon={Film} label="Cursor">');
    expect(statusStripSource).toContain('inline-flex w-[12rem] max-w-[30vw] shrink-0');
    expect(statusStripSource).toContain('inline-flex w-[6.5rem] shrink-0');
    expect(statusStripSource).toContain('hidden w-[7rem] shrink-0');
    expect(statusStripSource).toContain('xl:inline-flex');
    expect(statusStripSource).toContain(
      "Window size ${msaWindowSize ?? '-'} / Step size ${msaStepSize ?? '-'}"
    );
    expect(statusStripSource).toContain("W ${msaWindowSize ?? '-'} / S ${msaStepSize ?? '-'}");
    expect(statusStripSource).toContain('text-[10px] text-foreground leading-tight font-semibold');
    expect(playerBarSource).toContain('text-xs font-bold leading-tight tracking-tight uppercase');
    expect(playerBarSource).toContain('inline-flex w-[7rem] shrink-0');
    expect(statusStripSource).not.toContain('Tree Type');
    expect(statusStripSource).not.toContain('Badge');
    const timelineStatusPosition = playerBarSource.indexOf('<TimelineStatusStrip />');
    const msaActionPosition = playerBarSource.indexOf('<MsaPlayerBarAction');
    const playbackSettingsPosition = playerBarSource.indexOf(
      'aria-label={MOVIE_PLAYER_ARIA_LABELS.playbackSettings}'
    );
    const motionStatusPosition = playerBarSource.indexOf(
      '<MotionStatusSlot stage={currentAnimationStage} />'
    );

    expect(timelineStatusPosition).toBeLessThan(msaActionPosition);
    expect(msaActionPosition).toBeLessThan(playbackSettingsPosition);
    expect(playbackSettingsPosition).toBeLessThan(motionStatusPosition);
  });
});
