// Secondary text reads (solid muted, 5.5:1), status colours are tokens, every tooltip is the
// same dark surface, and emerald means only "moved".
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createTaxonTooltip } from '../../../../src/treeVisualisation/deckgl/context/tooltipUtils.js';

const read = (path) => readFileSync(path, 'utf8');
const sources = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sources(path);
    return /\.(jsx|tsx)$/.test(name) ? [[path, read(path)]] : [];
  });
const ui = [...sources('src/components'), ...sources('src/pages')];

describe('secondary text', () => {
  it('is solid muted-foreground; only a lone separator glyph stays faint', () => {
    for (const [path, source] of ui) {
      const faint = source.match(/text-muted-foreground\/\d+[^>]*>[^<]*</g) ?? [];
      for (const use of faint) expect(use, path).toMatch(/>\s*[|/-]\s*<$/);
    }
  });

  it('uses the status tokens, not hard-coded amber or emerald', () => {
    for (const [path, source] of ui) {
      expect(source, path).not.toMatch(/(text|bg|border)-(amber|emerald)-\d/);
    }
  });
});

describe('tooltips', () => {
  it('are one dark surface: the island carries its own tokens to whatever is inside', () => {
    const tooltip = read('src/components/ui/tooltip.tsx');
    expect(tooltip).toContain("'dark bg-popover text-popover-foreground");
    expect(tooltip).toContain('bg-popover fill-popover');

    for (const [path, source] of ui) {
      const overrides =
        source.match(/(contentClassName|<TooltipContent[^>]*className)="[^"]*"/g) ?? [];
      for (const classes of overrides)
        expect(classes, path).not.toMatch(/\b(bg|text)-(popover|card|foreground|background)\b/);
    }
  });

  it('on the tree is the same surface, from the tokens', () => {
    const { className, style } = createTaxonTooltip({ object: { name: 'Emu' } }, null);
    expect(className).toBe('deck-tooltip dark');
    expect(style).toMatchObject({
      backgroundColor: 'var(--popover)',
      color: 'var(--popover-foreground)',
    });
  });
});

describe('splash', () => {
  it('draws with the brand tokens, its text at muted-foreground or stronger', () => {
    const splash = read('src/pages/Splash/SplashApp.jsx');
    expect(splash).not.toMatch(/slate-|blue-|cyan-|gradient/);
    expect(splash).toContain('[--progress-color:var(--signal)]');
    expect(read('src/components/ui/progress.tsx')).not.toContain('hsl(var(');
  });
});
