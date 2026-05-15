import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('MSA window layering', () => {
  it('keeps the alignment viewer above timeline and HUD controls', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'src/components/msa/MsaRndWindow.jsx'),
      'utf8',
    );

    expect(source).toContain('z-[1100]');
    expect(source).not.toContain('z-40');
  });
});
