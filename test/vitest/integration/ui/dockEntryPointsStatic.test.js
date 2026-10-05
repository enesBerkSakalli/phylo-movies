import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const source = (path) => readFileSync(join(process.cwd(), path), 'utf8');

// The open flags do not change when a panel is already open behind another tab, so the store
// subscription stays silent; each entry point raises its panel itself.
describe('dock entry points surface an already-open panel', () => {
  it.each([
    ['src/components/sidebar/MsaSidebarSection.jsx', "openPanel('alignment')"],
    ['src/components/movie-player/MoviePlayerBar.jsx', "openPanel('alignment')"],
    ['src/components/movie-player/MoviePlayerBar.jsx', "openPanel('inspector')"],
    ['src/components/appearance/color/ColoringPanel.jsx', "openPanel('taxa-coloring')"],
  ])('%s calls %s', (file, call) => {
    expect(source(file)).toContain(call);
  });
});

// The inspector opens on demand from the player bar, never as a side effect of selecting a segment.
describe('selecting a timeline segment does not open the inspector', () => {
  it('has no inspector binding to the selected segment', () => {
    const sync = source('src/components/dock/dockPanelSync.js');
    expect(sync).not.toContain('selectedTimelineSegmentIndex');
    expect(sync).not.toContain('inspector');
  });

  it('opens it from an enabled-on-selection button in the player bar', () => {
    const bar = source('src/components/movie-player/MoviePlayerBar.jsx');
    expect(bar).toContain('aria-label="Inspect transition"');
    expect(bar).toContain('disabled={!canInspect}');
  });
});
