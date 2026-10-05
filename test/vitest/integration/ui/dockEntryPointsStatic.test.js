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
    ['src/components/appearance/color/ColoringPanel.jsx', "openPanel('taxa-coloring')"],
  ])('%s calls %s', (file, call) => {
    expect(source(file)).toContain(call);
  });
});
