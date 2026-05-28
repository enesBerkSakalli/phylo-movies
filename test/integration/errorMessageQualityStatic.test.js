import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = process.cwd();

function source(path) {
  return readFileSync(join(repoRoot, path), 'utf8');
}

describe('error message quality guardrails', () => {
  it('keeps the React error boundary user-facing and developer-actionable', () => {
    const boundarySource = source('src/ErrorBoundary.jsx');

    expect(boundarySource).toContain('Phylo-Movies could not render this view');
    expect(boundarySource).toContain('Reload page');
    expect(boundarySource).toContain('Technical details');
    expect(boundarySource).not.toContain('Something went wrong');
    expect(boundarySource).not.toContain('Stack Trace');
  });

  it('keeps startup failure markup escaped and reportable', () => {
    const mainSource = source('src/main.jsx');

    expect(mainSource).toContain('escapeHtml');
    expect(mainSource).toContain('Phylo-Movies could not start');
    expect(mainSource).toContain('Technical details');
    expect(mainSource).not.toContain('<p>${message}</p>');
  });

  it('keeps media failure toasts actionable instead of silent console-only failures', () => {
    const saveImageSource = source('src/components/media/SaveImageButton.jsx');
    const recordingSource = source('src/components/media/RecordingControls.jsx');

    expect(saveImageSource).toContain('PNG export is not ready yet.');
    expect(saveImageSource).toContain('PNG export could not find the visualization canvas.');
    expect(saveImageSource).toContain('PNG saved.');
    expect(recordingSource).toContain('Recording could not start.');
    expect(recordingSource).toContain('Recording could not be saved.');
  });
});
