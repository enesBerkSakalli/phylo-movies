// Focus is one cyan ring everywhere (2 px solid --ring, offset) except the timeline strip, where
// cyan is the playhead and the ring is ink; Play is the one filled signal button, and the dark
// signal parts from the strip's bars as well as from the background.
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { colorToRgb } from '../../../../src/services/ui/colorUtils.js';

const read = (path) => readFileSync(path, 'utf8');
const css = read('src/css/index.css');

const luminance = (color) => {
  const [r, g, b] = colorToRgb(color).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
const tokens = (selector) => {
  const block = css.slice(css.indexOf(`${selector} {`)).split('}')[0];
  return Object.fromEntries(
    [...block.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map(([, k, v]) => [k, v])
  );
};

describe('focus ring', () => {
  it('is a solid 2 px --ring with an offset, by default', () => {
    expect(css).toMatch(
      /:focus-visible\s*{\s*outline:\s*2px solid var\(--ring\);\s*outline-offset:\s*2px;/
    );
    expect(css).not.toMatch(/outline-ring\/\d+/);
  });

  it('is never a translucent ring in the ui primitives', () => {
    for (const file of readdirSync('src/components/ui')) {
      expect(read(`src/components/ui/${file}`), file).not.toMatch(/ring-ring\/\d+/);
    }
  });

  it('is --ring on the dock tabs (the strip is pinned with the timeline keyboard tests)', () => {
    expect(read('src/css/dock.css')).toMatch(
      /\.dv-tab:focus-visible::after[\s\S]*?outline: 2px solid var\(--ring\) !important;/
    );
  });
});

describe('strip focus ring', () => {
  it('is the ink, readable on the page background in both themes', () => {
    for (const theme of [tokens(':root'), tokens('.dark')]) {
      expect(contrast(theme['--foreground'], theme['--background'])).toBeGreaterThanOrEqual(12);
    }
  });
});

describe('Play', () => {
  it('is the filled signal button; the other transport buttons stay ghost', () => {
    const source = read('src/components/movie-player/TransportControls.jsx');
    const play = source.slice(source.indexOf('(Space)')).split('</Button>')[0];

    expect(play).toContain('bg-signal');
    expect(play).toContain('text-signal-foreground');
    expect(source.match(/variant="ghost"/g)).toHaveLength(4);
  });
});

describe('dark signal', () => {
  it('parts from the bars and the background, and carries a background-coloured icon', () => {
    const dark = tokens('.dark');

    expect(contrast(dark['--signal'], dark['--data-mark'])).toBeGreaterThanOrEqual(1.5);
    expect(contrast(dark['--signal'], dark['--background'])).toBeGreaterThanOrEqual(3);
    expect(contrast(dark['--signal'], dark['--signal-foreground'])).toBeGreaterThanOrEqual(3);
    expect(dark['--ring']).toBe(dark['--signal']);
  });

  it('leaves the light signal as it is', () => {
    expect(tokens(':root')['--signal']).toBe('oklch(0.609 0.111 221.7)');
  });
});
