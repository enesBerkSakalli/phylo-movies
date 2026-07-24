import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const repoRoot = process.cwd();

function readWorkspaceSource(relativePath) {
  return readFileSync(
    join(repoRoot, 'src', 'pages', 'WorkspaceInitialization', relativePath),
    'utf8'
  );
}

describe('workspace homepage quality contracts', () => {
  it('preserves backend status identity when a health response is unchanged', async () => {
    const { reconcileBackendStatus } =
      await import('../../../../src/pages/WorkspaceInitialization/useWorkspaceInitializationForm.js');
    const current = {
      state: 'ready',
      capabilities: ['movie-processing'],
      version: '1.0.0',
    };

    expect(reconcileBackendStatus(current, { ...current })).toBe(current);
    expect(reconcileBackendStatus(current, { ...current, version: '1.1.0' })).toEqual({
      ...current,
      version: '1.1.0',
    });
  });

  it('uses URL-backed tabs and keeps recent runs after the primary workspace controls', () => {
    const source = readWorkspaceSource('WorkspaceInitializationPage.jsx');

    expect(source).toContain('useSearchParams');
    expect(source).toContain("searchParams.get('tab')");
    expect(source.indexOf('<RecentRunsPanel />')).toBeGreaterThan(source.indexOf('<Tabs'));
  });

  it('uses accessible shadcn dialogs for processing and destructive deletion', () => {
    const processingSource = readWorkspaceSource('components/ProcessingOverlay.jsx');
    const recentRunsSource = readWorkspaceSource('components/RecentRunsPanel.jsx');

    expect(processingSource).toContain('<DialogContent');
    expect(processingSource).toContain('<DialogTitle');
    expect(recentRunsSource).toContain('<AlertDialog');
    expect(recentRunsSource).toContain('<AlertDialogAction');
    expect(recentRunsSource).toContain('Remove saved run?');
  });

  it('restricts tree selection and removes redundant native-button key handlers', () => {
    const projectFilesSource = readWorkspaceSource('components/project/ProjectFileSection.jsx');
    const uploadZoneSource = readFileSync(
      join(repoRoot, 'src', 'components', 'ui', 'file-upload-zone.tsx'),
      'utf8'
    );

    expect(projectFilesSource).toContain("'.newick'");
    expect(projectFilesSource).toContain("'.trees'");
    expect(uploadZoneSource).not.toContain('handleBrowseKeyDown');
  });

  it('serves a responsive preview instead of the full social image', () => {
    const source = readWorkspaceSource('WorkspaceInitializationPage.jsx');

    expect(source).toContain('<picture>');
    expect(source).toContain('phylo-movies-preview-960.webp');
    expect(source).toContain('srcSet');
  });

  it('does not expose unused alert and base-path hook contracts', () => {
    const source = readWorkspaceSource('useWorkspaceInitializationForm.js');

    expect(source).not.toContain('useMemo');
    expect(source).not.toMatch(/\n\s+showAlert,\n/);
    expect(source).not.toMatch(/\n\s+clearAlert,\n/);
    expect(source).not.toMatch(/\n\s+base,\n/);
  });
});
