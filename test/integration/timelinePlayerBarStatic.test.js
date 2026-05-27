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
    expect(toolbarSource).toContain('opacity-45');
    expect(toolbarSource).toContain('hover:opacity-100');
    expect(toolbarSource).toContain('focus-within:opacity-100');
    expect(toolbarSource).not.toContain('bg-muted/40');
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
    expect(managerSource).toContain('getTimelineStatusSnapshot');
    expect(managerSource).toContain('buildTimelineStatusSnapshot');
    expect(statusStripSource).toContain('selectMovieTimelineManager');
    expect(statusStripSource).toContain('selectCurrentAnimationStage');
    expect(statusStripSource).toContain('AnimationStageStatus');
    expect(statusStripSource).toContain('getTimelineStatusSnapshot');
    expect(statusStripSource).toContain('buildTimelineStatusSnapshot');
    expect(statusStripSource).toContain('Movie timeline status');
    expect(statusStripSource).toContain('flex-nowrap overflow-hidden');
    expect(statusStripSource).toContain('border-border/40 bg-muted/20 backdrop-blur-sm');
    expect(statusStripSource).toContain('text-xs font-bold leading-tight tracking-tight uppercase');
    expect(statusStripSource).toContain(
      'text-[10px] text-muted-foreground/80 leading-tight font-medium'
    );
    expect(statusStripSource).toContain('inline-flex w-[18rem] max-w-[40vw] shrink-0');
    expect(statusStripSource).toContain('inline-flex w-[10rem] shrink-0');
    expect(statusStripSource).toContain('inline-flex w-[14rem] shrink-0');
    expect(statusStripSource).toContain("Window size {msaWindowSize ?? '-'}");
    expect(statusStripSource).toContain("Step size {msaStepSize ?? '-'}");
    expect(statusStripSource).toContain('text-[10px] text-foreground leading-tight font-semibold');
    expect(statusStripSource).not.toContain('Tree Type');
    expect(statusStripSource).not.toContain('Badge');
    expect(playerBarSource.indexOf('<TimelineStatusStrip />')).toBeLessThan(
      playerBarSource.indexOf('MOVIE_PLAYER_ARIA_LABELS.playbackSettings')
    );
  });
});
