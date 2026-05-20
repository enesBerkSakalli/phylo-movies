import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = dirname(dirname(dirname(fileURLToPath(import.meta.url))));

describe('clipboard comparison controls', () => {
  it('keeps comparison dismissal owned by the HUD clipboard section', () => {
    const appSource = readFileSync(join(repoRoot, 'src/App.jsx'), 'utf8');
    const clipboardSectionSource = readFileSync(
      join(repoRoot, 'src/components/HUD/clipboard/ClipboardSection.jsx'),
      'utf8',
    );

    expect(appSource).not.toContain('ClipboardDismissButton');
    expect(existsSync(join(repoRoot, 'src/components/HUD/clipboard/ClipboardDismissButton.jsx'))).toBe(false);
    expect(clipboardSectionSource).toContain('aria-label="Hide comparison tree"');
  });
});
