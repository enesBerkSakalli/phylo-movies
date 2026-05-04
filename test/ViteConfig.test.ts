import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { resolvePublicationDataPath } from '../vite.config.mts';

describe('resolvePublicationDataPath', () => {
  const baseDir = path.resolve('/repo/publication_data');

  it('resolves example files inside publication_data', () => {
    expect(resolvePublicationDataPath('/examples/noro/data.json', baseDir)).toBe(
      path.join(baseDir, 'noro/data.json')
    );
  });

  it('rejects paths outside publication_data', () => {
    expect(resolvePublicationDataPath('/examples/../package.json', baseDir)).toBeNull();
    expect(resolvePublicationDataPath('/examples/%2e%2e/package.json', baseDir)).toBeNull();
  });
});
