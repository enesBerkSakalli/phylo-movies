import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = dirname(dirname(dirname(fileURLToPath(import.meta.url))));

const legacyModules = [
  {
    filePath: join(repoRoot, 'src', 'domain', 'tree', ['subtree', 'FrequencyUtils.js'].join('')),
    importPath: ['domain', 'tree', ['subtree', 'FrequencyUtils'].join('')].join('/'),
  },
  {
    filePath: join(repoRoot, 'src', 'treeVisualisation', 'utils', ['Change', 'Metric', 'Utils.js'].join('')),
    importPath: ['treeVisualisation', 'utils', ['Change', 'Metric', 'Utils'].join('')].join('/'),
  },
  {
    filePath: join(repoRoot, 'src', 'treeVisualisation', 'utils', ['split', 'Matching.js'].join('')),
    importPath: ['utils', ['split', 'Matching.js'].join('')].join('/'),
  },
];

const obsoleteDiagnostics = [
  join(repoRoot, 'scripts', 'diagnostics', ['subtree', 'logic', 'debug.js'].join('_')),
  join(repoRoot, 'test', ['reproduce', 'tooltip', 'issue.test.js'].join('_')),
];

const obsoleteShimFiles = [
  join(repoRoot, 'src', 'lib', 'shims', 'child-process-browser.js'),
];

function collectSourceFiles(directory) {
  return readdirSync(directory).flatMap((entry) => {
    const fullPath = join(directory, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      return collectSourceFiles(fullPath);
    }

    return /\.(jsx?|tsx?|mts|cts)$/.test(entry) ? [fullPath] : [];
  });
}

describe('legacy module aliases', () => {
  it('does not use the source path alias in imports or test mocks', () => {
    const files = [
      ...collectSourceFiles(join(repoRoot, 'src')),
      ...collectSourceFiles(join(repoRoot, 'test')),
    ];
    const currentTestFile = fileURLToPath(import.meta.url);
    const sourceAliasPatterns = [
      /\bfrom\s*['"]@\//,
      /\bimport\s*['"]@\//,
      /\bimport\s*\(\s*['"]@\//,
      /\brequire\s*\(\s*['"]@\//,
      /\b(?:vi\.)?(?:mock|doMock|unmock)\s*\(\s*['"]@\//,
    ];

    const aliasReferences = files
      .filter((file) => file !== currentTestFile)
      .filter((file) => sourceAliasPatterns.some((pattern) => pattern.test(readFileSync(file, 'utf8'))))
      .map((file) => relative(repoRoot, file));

    expect(aliasReferences).toEqual([]);
  });

  it('are removed from source and test imports', () => {
    const files = [
      ...collectSourceFiles(join(repoRoot, 'src')),
      ...collectSourceFiles(join(repoRoot, 'test')),
    ];

    for (const legacyModule of legacyModules) {
      expect(existsSync(legacyModule.filePath), relative(repoRoot, legacyModule.filePath)).toBe(false);

      const importReferences = files
        .filter((file) => file !== fileURLToPath(import.meta.url))
        .filter((file) => readFileSync(file, 'utf8').includes(legacyModule.importPath))
        .map((file) => relative(repoRoot, file));

      expect(importReferences, legacyModule.importPath).toEqual([]);
    }
  });

  it('does not keep obsolete one-off diagnostic scripts', () => {
    for (const filePath of obsoleteDiagnostics) {
      expect(existsSync(filePath), relative(repoRoot, filePath)).toBe(false);
    }
  });

  it('does not keep unused Babel alias tooling', () => {
    const packageJson = JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf8'));
    const dependencyNames = new Set([
      ...Object.keys(packageJson.dependencies || {}),
      ...Object.keys(packageJson.devDependencies || {}),
    ]);

    expect(dependencyNames.has('babel-plugin-module-resolver')).toBe(false);

    const babelConfigSource = readFileSync(join(repoRoot, '.babelrc'), 'utf8');
    expect(babelConfigSource).not.toContain('module-resolver');
    expect(babelConfigSource).not.toMatch(/"@"\s*:\s*"\\.\/src"/);

    const componentsConfig = JSON.parse(readFileSync(join(repoRoot, 'components.json'), 'utf8'));
    for (const aliasPath of Object.values(componentsConfig.aliases || {})) {
      expect(aliasPath).not.toMatch(/^@\//);
    }
  });

  it('does not keep browser-only Node module shims', () => {
    for (const filePath of obsoleteShimFiles) {
      expect(existsSync(filePath), relative(repoRoot, filePath)).toBe(false);
    }

    const viteConfigSource = readFileSync(join(repoRoot, 'vite.config.mts'), 'utf8');
    expect(viteConfigSource).not.toContain('child-process-browser');
    expect(viteConfigSource).not.toContain('node:child_process');
    expect(viteConfigSource).not.toMatch(/\bchild_process\s*:/);
    expect(viteConfigSource).not.toMatch(/\bdefine\s*:\s*\{[\s\S]*\bglobal\s*:\s*['"]globalThis['"]/);
    expect(viteConfigSource).not.toMatch(/\bdefine\s*:\s*\{[\s\S]*['"]process\.env['"]\s*:/);
  });

  it('does not keep the legacy home route or home page UI wrapper', () => {
    const routerSource = readFileSync(join(repoRoot, 'src', 'Router.jsx'), 'utf8');
    const docsLandingSource = readFileSync(
      join(repoRoot, 'src', 'pages', 'GitHubPages', 'GitHubPagesInfoPage.jsx'),
      'utf8',
    );
    const workspaceLandingSource = readFileSync(
      join(repoRoot, 'src', 'pages', 'WorkspaceInitialization', 'WorkspaceInitializationPage.jsx'),
      'utf8',
    );
    const seoScriptSource = readFileSync(join(repoRoot, 'scripts', 'apply-gh-seo.js'), 'utf8');
    const readmeSource = readFileSync(join(repoRoot, 'README.md'), 'utf8');

    expect(routerSource).not.toContain('path="/home"');
    expect(docsLandingSource).not.toContain('/home');
    expect(docsLandingSource).not.toContain('home-page');
    expect(workspaceLandingSource).not.toContain('home.css');
    expect(workspaceLandingSource).not.toContain('home-page');
    expect(seoScriptSource).not.toContain('/home');
    expect(readmeSource).not.toContain('/home');
    expect(existsSync(join(repoRoot, 'src', 'css', 'home.css'))).toBe(false);
  });
});
