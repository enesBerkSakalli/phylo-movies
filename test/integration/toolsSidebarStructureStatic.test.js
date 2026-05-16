import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const repoRoot = process.cwd();

function source(path) {
  return readFileSync(join(repoRoot, path), 'utf8');
}

describe('tools sidebar structure', () => {
  it('keeps sidebar composition out of App', () => {
    const appSource = source('src/App.jsx');

    expect(appSource).toContain('<ToolsSidebar');
    expect(appSource).not.toContain('<Sidebar collapsible="icon">');
    expect(appSource).not.toContain('<SidebarGroupLabel>');
    expect(appSource).not.toContain("from './components/nav/ButtonsMSA.jsx'");
    expect(appSource).not.toContain("from './components/appearance/Appearance.jsx'");
    expect(appSource).not.toContain("from './components/appearance/controls/VisualElements/VisualElements.jsx'");
  });

  it('orders tools by the research workflow', () => {
    const sidebarSource = source('src/components/sidebar/ToolsSidebar.jsx');
    const labels = [...sidebarSource.matchAll(/<SidebarGroupLabel>(.*?)<\/SidebarGroupLabel>/g)].map((match) => match[1]);

    expect(labels).toEqual([
      'Dataset',
      'Tree View',
      'Analysis',
      'Color & Focus',
    ]);
  });

  it('keeps visual element and visual effect sections scoped to their responsibility', () => {
    expect(source('src/components/appearance/controls/VisualElements/VisualElements.jsx')).not.toContain('<VisualStyle');
    expect(source('src/components/appearance/Appearance.jsx')).not.toContain('<PerspectiveSection');
  });

  it('keeps expandable tool panels closed by default for scanability', () => {
    const expandableToolFiles = [
      'src/components/nav/ButtonsMSA.jsx',
      'src/components/appearance/layout/TreeStructureGroup.jsx',
      'src/components/appearance/controls/VisualStyle/VisualStyle.jsx',
      'src/components/appearance/controls/VisualElements/VisualElements.jsx',
      'src/components/appearance/Appearance.jsx',
      'src/components/appearance/FocusHighlightingSection.jsx',
      'src/components/appearance/PivotEdgeEffectsSection.jsx',
      'src/components/TreeStatsPanel/TreeStatsPanel.tsx',
      'src/components/TreeStatsPanel/Shared/TaxaLegend.tsx',
      'src/components/TreeStatsPanel/SubtreeAnalytics/MovedSubtreeRecurrenceList.tsx',
    ];

    const defaultOpenFiles = expandableToolFiles
      .filter((file) => source(file).includes('defaultOpen'));

    expect(defaultOpenFiles).toEqual([]);
  });

  it('visually distinguishes an expanded sidebar tool from a closed one', () => {
    const sidebarSource = source('src/components/ui/sidebar.tsx');

    expect(sidebarSource).toContain('data-[state=open]:bg-sidebar-accent');
  });

  it('uses one expandable-tool chevron convention', () => {
    const expandableToolFiles = [
      'src/components/nav/ButtonsMSA.jsx',
      'src/components/appearance/layout/TreeStructureGroup.jsx',
      'src/components/appearance/controls/VisualStyle/VisualStyle.jsx',
      'src/components/appearance/controls/VisualElements/VisualElements.jsx',
      'src/components/appearance/Appearance.jsx',
      'src/components/appearance/FocusHighlightingSection.jsx',
      'src/components/appearance/PivotEdgeEffectsSection.jsx',
      'src/components/TreeStatsPanel/TreeStatsPanel.tsx',
      'src/components/TreeStatsPanel/Shared/TaxaLegend.tsx',
      'src/components/TreeStatsPanel/SubtreeAnalytics/MovedSubtreeRecurrenceList.tsx',
    ];

    const filesWithRightChevron = expandableToolFiles
      .filter((file) => source(file).includes('ChevronRight'));

    expect(filesWithRightChevron).toEqual([]);
  });
});
