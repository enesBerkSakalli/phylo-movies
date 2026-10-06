import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { colorToRgb, cssColor, themeColor } from '../../../../src/services/ui/colorUtils.js';

const expectRgbNear = (actual, expected) =>
  actual.forEach((channel, i) => expect(Math.abs(channel - expected[i])).toBeLessThanOrEqual(1));

describe('CSS colours for canvases', () => {
  it('converts oklch() tokens to sRGB bytes', () => {
    expectRgbNear(colorToRgb('oklch(0.609 0.111 221.7)'), [8, 145, 178]); // #0891b2, the signal
    expectRgbNear(colorToRgb(' oklch(0.208 0.042 266) '), [15, 23, 42]); // #0f172a, the ink
    expect(colorToRgb('oklch(1 0 0)')).toEqual([255, 255, 255]);
  });

  it('still rejects what is not a colour', () => {
    expect(colorToRgb('oklch(nope)')).toEqual([0, 0, 0]);
    expect(colorToRgb('12zz34')).toEqual([0, 0, 0]);
  });

  it('reads a custom property as the element sees it, inherited or not', () => {
    const { document } = new JSDOM(
      '<div style="--signal: oklch(0.609 0.111 221.7)"><span></span></div>'
    ).window;
    expectRgbNear(cssColor(document.querySelector('span'), '--signal'), [8, 145, 178]);
  });

  it('reads a theme token where the theme is loaded, else the fallback', () => {
    const { document } = new JSDOM('<html style="--moved: oklch(0.5 0.1 160)"></html>').window;
    expect(themeColor('--moved', '#10b981', document.documentElement)).toEqual(
      colorToRgb('oklch(0.5 0.1 160)')
    );
    expect(themeColor('--absent', '#10b981', document.documentElement)).toEqual([16, 185, 129]);
    expect(themeColor('--moved', [1, 2, 3], undefined)).toEqual([1, 2, 3]); // no document: a worker
  });

  it('gives every theme token a dark value, so a dark toggle needs only the class', () => {
    const css = readFileSync('src/css/index.css', 'utf8');
    const block = (selector) => css.slice(css.indexOf(`${selector} {`)).split('}')[0];
    const names = (text) => [...text.matchAll(/^\s*(--[\w-]+):/gm)].map(([, name]) => name);
    const dark = new Set(names(block('.dark')));
    const light = names(block(':root')).filter((name) => name !== '--radius');
    const roles = ['signal', 'signal-foreground', 'hover-mark', 'data-mark', 'data-mark-strong'];
    roles.push('axis', 'grid', 'moved', 'change', 'expand', 'collapse');
    roles.push('error', 'warning', 'success', 'info');

    expect(light).toEqual(expect.arrayContaining(roles.map((role) => `--${role}`)));
    expect(light.filter((name) => !dark.has(name))).toEqual([]);
    for (const role of roles) expect(css).toContain(`--color-${role}: var(--${role});`);
  });
});
