import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = dirname(dirname(dirname(fileURLToPath(import.meta.url))));

function readRepoFile(...segments) {
  return readFileSync(join(repoRoot, ...segments), 'utf8');
}

describe('movie timeline player bar semantics', () => {
  it('keeps timeline viewport controls available without mixing them into playback transport', () => {
    const playerBarSource = readRepoFile('src', 'components', 'movie-player', 'MoviePlayerBar.jsx');
    const timelineSliceSource = readRepoFile('src', 'state', 'phyloStore', 'slices', 'playback', 'treeTimeline.slice.js');
    const rendererSource = readRepoFile('src', 'timeline', 'renderers', 'DeckTimelineRenderer.js');

    expect(playerBarSource).toContain('TimelineScrollControls');
    expect(playerBarSource).toContain('Collapse timeline controls');
    expect(playerBarSource).toContain('Expand timeline controls');
    expect(timelineSliceSource).toContain('zoomInTimeline');
    expect(timelineSliceSource).toContain('scrollToEndTimeline');
    expect(rendererSource).toContain("'wheel'");
  });

  it('keeps the legend aligned with visible timeline states', () => {
    const playerBarSource = readRepoFile('src', 'components', 'movie-player', 'MoviePlayerBar.jsx');

    expect(playerBarSource).toContain('Source trees');
    expect(playerBarSource).toContain('Generated frames');
    expect(playerBarSource).toContain('Selected segment');
    expect(playerBarSource).toContain('Current position');
  });

  it('renders an explicit timeline loading state before the manager mounts', () => {
    const playerBarSource = readRepoFile('src', 'components', 'movie-player', 'MoviePlayerBar.jsx');

    expect(playerBarSource).toContain('role="status"');
    expect(playerBarSource).toContain('Loading movie timeline');
  });

  it('separates movie transport actions from comparison view actions', () => {
    const transportSource = readRepoFile('src', 'components', 'movie-player', 'TransportControls.jsx');

    expect(transportSource).toContain('aria-label="Playback and comparison controls"');
    expect(transportSource).toContain('aria-label="Movie playback controls"');
    expect(transportSource).toContain('aria-label="Comparison view controls"');
  });

  it('keeps the timeline viewport toolbar component present', () => {
    const toolbarPath = join(
      repoRoot,
      'src',
      'components',
      'movie-player',
      'TimelineScrollControls',
      'TimelineScrollControls.jsx'
    );

    expect(existsSync(toolbarPath)).toBe(true);
  });
});
