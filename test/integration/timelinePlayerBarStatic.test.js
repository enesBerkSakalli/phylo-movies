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
      'Current position',
    ]);
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
    expect(playerBarSource).toContain('MOVIE_PLAYER_ARIA_LABELS.timelineNavigation');
    expect(playerBarSource).toContain('MOVIE_PLAYER_ARIA_LABELS.timelineTrack');
  });
});
