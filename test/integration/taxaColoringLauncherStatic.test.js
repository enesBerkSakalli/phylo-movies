import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const repoRoot = process.cwd();

function source(path) {
  return readFileSync(join(repoRoot, path), 'utf8');
}

describe('taxa coloring launcher', () => {
  it('opens and focuses the floating taxa coloring window from App', () => {
    const appSource = source('src/App.jsx');
    const sidebarSource = source('src/components/sidebar/ToolsSidebar.jsx');
    const taxaHighlightsSource = source(
      'src/components/appearance/controls/VisualElements/TaxaAndHighlightsSection.jsx'
    );

    expect(appSource).toContain('openTaxaColoringWindow');
    expect(appSource).toContain("setActiveFloatingWindow('taxa-coloring')");
    expect(appSource).toContain('setTaxaColoringOpen(true)');
    expect(appSource).toContain('onOpenTaxaColoring={openTaxaColoringWindow}');
    expect(sidebarSource).toContain('onOpenTaxaColoring');
    expect(sidebarSource).toContain(
      '<TaxaAndHighlightsSection onOpenTaxaColoring={onOpenTaxaColoring} />'
    );
    expect(taxaHighlightsSource).toContain('onOpenTaxaColoring');
    expect(taxaHighlightsSource).toContain(
      '<ColoringPanel onOpenTaxaColoring={onOpenTaxaColoring} />'
    );
  });

  it('uses a visible compact shadcn button instead of the legacy helper block', () => {
    const sourceText = source('src/components/appearance/color/ColoringPanel.jsx');

    expect(sourceText).toContain("variant={taxaColoringOpen ? 'secondary' : 'outline'}");
    expect(sourceText).toContain('className="w-full justify-start h-8 text-xs font-normal"');
    expect(sourceText).toContain('disabled={!hasTaxa}');
    expect(sourceText).not.toContain('variant="secondary"');
    expect(sourceText).not.toContain('Set colors for taxa or groups in a separate window.');
  });

  it('labels the icon-only close button', () => {
    const sourceText = source('src/components/taxa-coloring/TaxaColoringRndWindow.jsx');

    expect(sourceText).toContain('aria-label="Close taxa coloring window"');
  });
});
