import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = dirname(dirname(dirname(fileURLToPath(import.meta.url))));

function collectSourceFiles(directory) {
  return readdirSync(directory).flatMap((entry) => {
    const fullPath = join(directory, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      return collectSourceFiles(fullPath);
    }

    return /\.(jsx?|tsx?)$/.test(entry) ? [fullPath] : [];
  });
}

describe('workspace initialization input contract', () => {
  it('does not keep a frontend client for the old synchronous treedata endpoint', () => {
    const serviceFiles = [
      join(repoRoot, 'src', 'services', 'data', 'apiConfig.js'),
      join(repoRoot, 'src', 'services', 'data', 'dataService.js'),
    ];
    const workspaceFiles = collectSourceFiles(
      join(repoRoot, 'src', 'pages', 'WorkspaceInitialization')
    );
    const checkedFiles = [...serviceFiles, ...workspaceFiles];

    const oldEndpointReferences = checkedFiles
      .filter((file) => {
        const source = readFileSync(file, 'utf8');
        return /['"]\/treedata['"]/.test(source) || /\bfetchTreeData\b/.test(source);
      })
      .map((file) => relative(repoRoot, file));

    expect(oldEndpointReferences).toEqual([]);
  });

  it('does not keep the stale orderFile input field contract', () => {
    const workspaceFiles = collectSourceFiles(
      join(repoRoot, 'src', 'pages', 'WorkspaceInitialization')
    );

    const orderFileReferences = workspaceFiles
      .filter((file) => readFileSync(file, 'utf8').includes('orderFile'))
      .map((file) => relative(repoRoot, file));

    expect(orderFileReferences).toEqual([]);
  });

  it('keeps sliding-window input limits sourced from the form model constants', () => {
    const slidingWindowSource = readFileSync(
      join(
        repoRoot,
        'src',
        'pages',
        'WorkspaceInitialization',
        'components',
        'project',
        'SlidingWindowSection.jsx'
      ),
      'utf8'
    );

    expect(slidingWindowSource).toContain('WINDOW_MIN');
    expect(slidingWindowSource).toContain('WINDOW_MAX');
    expect(slidingWindowSource).toContain('STEP_MIN');
    expect(slidingWindowSource).toContain('STEP_MAX');
    expect(slidingWindowSource).not.toMatch(/\bmin=\{1\}/);
    expect(slidingWindowSource).not.toMatch(/\bmax=\{100000\}/);
  });

  it('uses specific validation copy for windowing and IQ-TREE support fields', async () => {
    const { workspaceInitializationFormSchema } =
      await import('../../src/pages/WorkspaceInitialization/workspaceInitializationFormModel.js');

    const result = workspaceInitializationFormSchema.safeParse({
      windowSize: 0,
      stepSize: 1.5,
      midpointRooting: false,
      treeInferenceEngine: 'iqtree',
      iqtreeFastSearch: true,
      iqtreeSupportMode: 'ufboot',
      iqtreeUfbootReplicates: 999,
      iqtreeShAlrtReplicates: 1000,
      iqtreeBnni: false,
      useGtr: true,
      useGamma: true,
      usePseudo: false,
      noMl: true,
    });

    expect(result.success).toBe(false);
    const messages = result.error.issues.map((issue) => issue.message);
    expect(messages).toContain('Window size must be at least 1 alignment column.');
    expect(messages).toContain('Step size must be a whole number of alignment columns.');
    expect(messages).toContain('UFBoot requires at least 1000 replicates.');
  });

  it('keeps SH-aLRT replicate validation separate from the UFBoot minimum', async () => {
    const { workspaceInitializationFormSchema } =
      await import('../../src/pages/WorkspaceInitialization/workspaceInitializationFormModel.js');

    const result = workspaceInitializationFormSchema.safeParse({
      windowSize: 750,
      stepSize: 500,
      midpointRooting: false,
      treeInferenceEngine: 'iqtree',
      iqtreeFastSearch: true,
      iqtreeSupportMode: 'sh_alrt',
      iqtreeUfbootReplicates: 1000,
      iqtreeShAlrtReplicates: 100,
      iqtreeBnni: false,
      useGtr: true,
      useGamma: true,
      usePseudo: false,
      noMl: true,
    });

    expect(result.success).toBe(true);
  });

  it('gates backend-dependent workspace actions on backend readiness', () => {
    const pageSource = readFileSync(
      join(repoRoot, 'src', 'pages', 'WorkspaceInitialization', 'WorkspaceInitializationPage.jsx'),
      'utf8'
    );
    const hookSource = readFileSync(
      join(
        repoRoot,
        'src',
        'pages',
        'WorkspaceInitialization',
        'useWorkspaceInitializationForm.js'
      ),
      'utf8'
    );
    const exampleTabSource = readFileSync(
      join(repoRoot, 'src', 'pages', 'WorkspaceInitialization', 'components', 'ExampleTab.jsx'),
      'utf8'
    );

    expect(pageSource).toContain("const backendReady = backendStatus.state === 'ready';");
    expect(pageSource).toContain('const disabled = submitting || loadingExample || !backendReady;');
    expect(pageSource).toContain('backendReady={backendReady}');
    expect(exampleTabSource).toContain('loadingExample || submitting || (!demoOnly && !backendReady)');
    expect(hookSource).toContain("resolveApiUrl('/health')");
    expect(hookSource).toContain("if (backendStatus.state !== 'ready')");
  });

  it('keeps saved processed runs accessible from the main workspace page', () => {
    const pageSource = readFileSync(
      join(repoRoot, 'src', 'pages', 'WorkspaceInitialization', 'WorkspaceInitializationPage.jsx'),
      'utf8'
    );
    const dataServiceSource = readFileSync(
      join(repoRoot, 'src', 'services', 'data', 'dataService.js'),
      'utf8'
    );
    const recentRunsSource = readFileSync(
      join(
        repoRoot,
        'src',
        'pages',
        'WorkspaceInitialization',
        'components',
        'RecentRunsPanel.jsx'
      ),
      'utf8'
    );

    expect(pageSource).toContain('<RecentRunsPanel />');
    expect(dataServiceSource).toContain('PHYLO_RUN_INDEX');
    expect(dataServiceSource).toContain('options.label');
    expect(dataServiceSource).toContain('openRun(runId)');
    expect(dataServiceSource).toContain('deleteRun(runId)');
    expect(recentRunsSource).toContain('Recent runs');
    expect(recentRunsSource).toContain("navigate('/visualization')");
  });

  it('keeps long-running processing cancellable from the loading overlay', () => {
    const pageSource = readFileSync(
      join(repoRoot, 'src', 'pages', 'WorkspaceInitialization', 'WorkspaceInitializationPage.jsx'),
      'utf8'
    );
    const hookSource = readFileSync(
      join(
        repoRoot,
        'src',
        'pages',
        'WorkspaceInitialization',
        'useWorkspaceInitializationForm.js'
      ),
      'utf8'
    );
    const overlaySource = readFileSync(
      join(
        repoRoot,
        'src',
        'pages',
        'WorkspaceInitialization',
        'components',
        'ProcessingOverlay.jsx'
      ),
      'utf8'
    );

    expect(pageSource).toContain('onCancel={demoOnly ? undefined : cancelOperation}');
    expect(hookSource).toContain('function cancelOperation()');
    expect(hookSource).toContain('controller.abort()');
    expect(overlaySource).toContain('Cancel processing');
    expect(overlaySource).toContain('role="dialog"');
  });
});
