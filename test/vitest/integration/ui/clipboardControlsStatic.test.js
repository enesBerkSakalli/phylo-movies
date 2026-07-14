import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const repoRoot = process.cwd();

describe('clipboard comparison controls', () => {
  it('keeps comparison dismissal owned by the HUD clipboard section', () => {
    const appSource = readFileSync(join(repoRoot, 'src/App.jsx'), 'utf8');
    const clipboardSectionSource = readFileSync(
      join(repoRoot, 'src/components/HUD/clipboard/ClipboardSection.jsx'),
      'utf8'
    );

    expect(appSource).not.toContain('ClipboardDismissButton');
    expect(
      existsSync(join(repoRoot, 'src/components/HUD/clipboard/ClipboardDismissButton.jsx'))
    ).toBe(false);
    expect(clipboardSectionSource).toContain('aria-label="Hide pinned tree"');
    expect(clipboardSectionSource).toContain('Pinned tree');
    expect(clipboardSectionSource).not.toContain('Compare with');
    expect(clipboardSectionSource).not.toContain('comparison tree');
  });
});
