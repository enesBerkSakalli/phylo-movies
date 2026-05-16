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
      join(repoRoot, 'src', 'services', 'data', 'dataManager.js'),
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
      join(repoRoot, 'src', 'pages', 'WorkspaceInitialization', 'components', 'project', 'SlidingWindowSection.jsx'),
      'utf8'
    );

    expect(slidingWindowSource).toContain('WINDOW_MIN');
    expect(slidingWindowSource).toContain('WINDOW_MAX');
    expect(slidingWindowSource).toContain('STEP_MIN');
    expect(slidingWindowSource).toContain('STEP_MAX');
    expect(slidingWindowSource).not.toMatch(/\bmin=\{1\}/);
    expect(slidingWindowSource).not.toMatch(/\bmax=\{100000\}/);
  });
});
