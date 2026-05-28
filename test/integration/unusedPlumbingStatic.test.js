import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = dirname(dirname(dirname(fileURLToPath(import.meta.url))));

describe('unused plumbing cleanup', () => {
  it('does not keep the unused grouping status summary component', () => {
    const statusSummaryPath = join(
      repoRoot,
      'src',
      'components',
      'taxa-coloring',
      'groups-tab',
      'GroupingStatusSummary.jsx'
    );

    expect(existsSync(statusSummaryPath), relative(repoRoot, statusSummaryPath)).toBe(false);
  });

  it('does not keep the removed SPR activity overview chart component', () => {
    const activityTimelinePath = join(
      repoRoot,
      'src',
      'components',
      'TreeStatsPanel',
      'SubtreeAnalytics',
      'SprActivityTimeline.tsx'
    );

    expect(existsSync(activityTimelinePath), relative(repoRoot, activityTimelinePath)).toBe(false);
  });

  it('does not keep dependency-only chart packages', () => {
    const packageJson = JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf8'));
    const dependencies = new Set([
      ...Object.keys(packageJson.dependencies || {}),
      ...Object.keys(packageJson.devDependencies || {}),
    ]);

    expect(dependencies.has('@nivo/bar')).toBe(false);
  });

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

  it('does not keep unused taxa-coloring separator normalization', () => {
    const sourcePath = join(
      repoRoot,
      'src',
      'components',
      'taxa-coloring',
      'utils',
      'colorManagement.js'
    );
    const source = readFileSync(sourcePath, 'utf8');

    expect(source).not.toContain('normalizeSeparator');
  });

  it('does not keep the unused deck.gl layer factory barrel', () => {
    const barrelPath = join(
      repoRoot,
      'src',
      'treeVisualisation',
      'deckgl',
      'layers',
      'factory',
      'index.js'
    );
    const optionalLayerTest = readFileSync(
      join(repoRoot, 'test', 'optional', 'layer-highlighting.test.js'),
      'utf8'
    );

    expect(existsSync(barrelPath), relative(repoRoot, barrelPath)).toBe(false);
    expect(optionalLayerTest).not.toContain('layers/factory/index.js');
  });

  it('does not keep obsolete one-off diagnostic scripts', () => {
    const obsoleteDiagnostics = [
      'audit_all_palettes.js',
      'check_d3_exports.js',
      'check_palette_contrast.js',
      'simulate_darkening.js',
    ];

    for (const fileName of obsoleteDiagnostics) {
      const filePath = join(repoRoot, 'scripts', 'diagnostics', fileName);
      expect(existsSync(filePath), relative(repoRoot, filePath)).toBe(false);
    }
  });

  it('does not keep generated BranchArchitect artifacts in the app workspace', () => {
    const generatedPaths = [
      join(repoRoot, 'engine', 'BranchArchitect', '.venv-build'),
      join(repoRoot, 'engine', 'BranchArchitect', 'webapp', '.venv'),
      join(repoRoot, 'engine', 'BranchArchitect', 'test', 'output'),
      join(
        repoRoot,
        'engine',
        'BranchArchitect',
        'brancharchitect',
        'static',
        'css',
        'matrix_enhanced.css'
      ),
      join(
        repoRoot,
        'engine',
        'BranchArchitect',
        'brancharchitect',
        'static',
        'js',
        'matrix-utils.js'
      ),
    ];

    for (const generatedPath of generatedPaths) {
      expect(existsSync(generatedPath), relative(repoRoot, generatedPath)).toBe(false);
    }

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

  it('does not keep unused global UI styles or marker attributes', () => {
    const globalCss = readFileSync(join(repoRoot, 'src', 'css', 'index.css'), 'utf8');
    const appSource = readFileSync(join(repoRoot, 'src', 'App.jsx'), 'utf8');

    expect(globalCss).not.toContain('animate-shimmer');
    expect(globalCss).not.toContain('animate-float');
    expect(globalCss).not.toContain('@keyframes shimmer');
    expect(globalCss).not.toContain('@keyframes float');
    expect(globalCss).not.toContain('HUD styles are imported');
    expect(globalCss).not.toContain('@source "../index.html"');

    expect(appSource).not.toContain('data-has-msa');
    expect(appSource).not.toContain('full-size-container');
  });

  it('does not keep dead UI imports or initializer assignments', () => {
    const coloringPanelSource = readFileSync(
      join(repoRoot, 'src', 'components', 'appearance', 'color', 'ColoringPanel.jsx'),
      'utf8'
    );
    const workspaceFormSource = readFileSync(
      join(
        repoRoot,
        'src',
        'pages',
        'WorkspaceInitialization',
        'useWorkspaceInitializationForm.js'
      ),
      'utf8'
    );
    const msaScrollbarsSource = readFileSync(
      join(repoRoot, 'src', 'components', 'msa', 'MSAScrollbars.jsx'),
      'utf8'
    );

    expect(coloringPanelSource).not.toContain('SidebarMenuSubButton');
    expect(workspaceFormSource).not.toContain('setValue, reset: resetForm');
    expect(msaScrollbarsSource).not.toContain('let targetCol = null');
    expect(msaScrollbarsSource).not.toContain('let targetRow = null');
  });
});
