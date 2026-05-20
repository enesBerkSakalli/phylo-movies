import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = dirname(dirname(dirname(fileURLToPath(import.meta.url))));

describe('HUD status controls', () => {
  it('removes the legacy HUD timeline controls after movie-player integration', () => {
    const legacyTimelineFiles = [
      'src/components/HUD/interpolation/InterpolationCoordinateSection.jsx',
      'src/components/HUD/interpolation/InterpolationSection.jsx',
      'src/components/HUD/msa/MSAWindowSection.jsx',
    ];
    const sharedSource = readFileSync(
      join(repoRoot, 'src/components/HUD/shared/hudShared.js'),
      'utf8',
    );

    legacyTimelineFiles.forEach((file) => {
      expect(existsSync(join(repoRoot, file))).toBe(false);
    });
    expect(sharedSource).not.toContain('selectGoToPosition');
    expect(sharedSource).not.toContain('buildInterpolationText');
    expect(sharedSource).not.toContain('buildSegmentText');
    expect(sharedSource).not.toContain('buildMsaWindow');
  });

  it('keeps timeline status out of the floating HUD after movie-player integration', () => {
    const hudSource = readFileSync(join(repoRoot, 'src/components/HUD/HUD.jsx'), 'utf8');

    expect(hudSource).not.toContain('InterpolationCoordinateSection');
    expect(hudSource).not.toContain('InterpolationSection');
    expect(hudSource).not.toContain('MSAWindowSection');
    expect(hudSource).toContain('ClipboardSection');
    expect(hudSource).toContain('Comparison Panel');
    expect(hudSource).not.toContain('Sequence Status Panel');
    expect(hudSource).not.toContain('sequence status panel');
  });
});
