import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const repoRoot = process.cwd();

describe('SPR analytics contract', () => {
  it('does not keep the legacy jumping-subtree temporal distribution helper', () => {
    const sprAnalyticsSource = readFileSync(
      join(repoRoot, 'src', 'domain', 'spr', 'sprAnalytics.js'),
      'utf8'
    );

    expect(sprAnalyticsSource).not.toContain('calculateSprTemporalDistribution');
    expect(sprAnalyticsSource).not.toContain('extractMovingSubtrees');
    expect(sprAnalyticsSource).not.toContain('parsePairTimeIndex');
    expect(existsSync(join(repoRoot, 'test', 'subtree-temporal.test.js'))).toBe(false);
  });
});
