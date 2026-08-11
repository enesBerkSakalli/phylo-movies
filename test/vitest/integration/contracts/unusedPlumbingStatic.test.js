import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

const repoRoot = process.cwd();

describe('unused plumbing cleanup', () => {
  it('keeps store JSDoc type imports resolvable', () => {
    const storePath = join(repoRoot, 'src', 'state', 'phyloStore', 'store.js');
    const storeSource = readFileSync(storePath, 'utf8');
    const importPaths = [...storeSource.matchAll(/import\(['"](\.{1,2}\/[^'"]+)['"]\)/g)].map(
      (match) => match[1]
    );

    const unresolvedPaths = importPaths
      .map((importPath) => resolve(dirname(storePath), importPath))
      .filter((importPath) => !existsSync(importPath))
      .map((importPath) => relative(repoRoot, importPath));

    expect(unresolvedPaths).toEqual([]);
  });

  it('keeps deck.gl mock restore plumbing private to the installer', () => {
    const helperPath = join(repoRoot, 'test', 'helpers', 'deckGLMocks.js');
    const helperSource = readFileSync(helperPath, 'utf8');

    expect(helperSource).not.toMatch(
      /module\.exports\s*=\s*\{[\s\S]*\brestoreDeckGLMocks\b[\s\S]*\}/
    );
  });

  it('does not export helpers that are private to their module', () => {
    const privateHelpers = [
      ['src/domain/backend/schemaValidation.ts', ['isRecord', 'assertArray']],
      ['src/domain/backend/solutionValidators.ts', ['validateSplitChangeEventList']],
      ['src/domain/backend/treePayloadValidators.ts', ['validateTreeNode', 'validateTreeMetadata']],
      ['src/domain/spr/sprAnalytics.js', ['normalizeSubtreeIndices', 'getSubtreeSignature']],
      ['src/domain/tree/splits.js', ['getElementSplitIndices', 'getSplitHash']],
      ['src/msaViewer/utils/colorUtils.js', ['dnaColor', 'proteinColor', 'grayscaleColor']],
      ['src/msaViewer/utils/dataUtils.js', ['guessTypeFromSeqs', 'convertPhyloToSequences']],
      ['src/services/ui/colorUtils.js', ['hslToRgb', 'colorToRgba']],
      ['src/timeline/utils/layerFactories.js', ['createScatterplotLayer', 'calculateRadius']],
      ['src/treeColoring/utils/GroupingUtils.js', ['getGroupForStrategy']],
      ['src/treeVisualisation/deckgl/layers/styles/labels/labelUtils.js', ['getSingleTreeSide']],
      ['src/treeVisualisation/deckgl/layers/styles/links/dashUtils.js', ['calculatePathLength']],
      ['src/treeVisualisation/utils/layoutCacheKey.js', ['getDatasetCacheId']],
    ];

    const exportedHelpers = privateHelpers.flatMap(([sourcePath, helperNames]) => {
      const source = readFileSync(join(repoRoot, sourcePath), 'utf8');
      return helperNames
        .filter((helperName) =>
          new RegExp(`\\bexport\\s+function\\s+${helperName}\\b`).test(source)
        )
        .map((helperName) => `${sourcePath}: ${helperName}`);
    });

    expect(exportedHelpers).toEqual([]);
  });

  it('does not keep generated BranchArchitect artifacts in the app workspace', () => {
    // Checked against the submodule's tracked files rather than the filesystem: .venv-build and
    // friends are gitignored precisely because they appear during a local build, so asserting
    // they are absent fails on any machine that has run one. What must not happen is committing
    // them.
    const generatedPaths = [
      '.venv-build',
      'webapp/.venv',
      'test/output',
      'brancharchitect/static/css/matrix_enhanced.css',
      'brancharchitect/static/js/matrix-utils.js',
    ];

    const tracked = execFileSync(
      'git',
      ['-C', join(repoRoot, 'engine', 'BranchArchitect'), 'ls-files', '--', ...generatedPaths],
      { encoding: 'utf8' }
    ).trim();
    expect(tracked, 'tracked BranchArchitect artifacts').toBe('');

    const gitignore = readFileSync(join(repoRoot, '.gitignore'), 'utf8');
    expect(gitignore).toContain('engine/BranchArchitect/.venv-build/');
    expect(gitignore).toContain('engine/BranchArchitect/webapp/.venv/');
    expect(gitignore).toContain('engine/BranchArchitect/test/output/');

    const branchArchitectGitignore = readFileSync(
      join(repoRoot, 'engine', 'BranchArchitect', '.gitignore'),
      'utf8'
    );
    expect(branchArchitectGitignore).toContain('/test/output/');
  });

});
