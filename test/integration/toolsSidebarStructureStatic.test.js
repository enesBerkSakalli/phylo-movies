import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { TOOLS_SIDEBAR_GROUP_LABELS } from '../../src/components/sidebar/ToolsSidebar.contract.js';

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

  it('does not keep the legacy MSA nav button component', () => {
    const legacyPath = join(repoRoot, 'src/components/nav/ButtonsMSA.jsx');
    const sidebarSource = source('src/components/sidebar/ToolsSidebar.jsx');

    expect(existsSync(legacyPath)).toBe(false);
    expect(sidebarSource).not.toContain('ButtonsMSA');
    expect(sidebarSource).not.toContain('../nav/ButtonsMSA.jsx');
  });

  it('orders tools by the research workflow', () => {
    const sidebarSource = source('src/components/sidebar/ToolsSidebar.jsx');

    expect(TOOLS_SIDEBAR_GROUP_LABELS).toEqual([
      'Dataset',
      'Tree View',
      'Analysis',
      'Color & Focus',
    ]);
    const labelUsePositions = [0, 1, 2, 3]
      .map((index) => sidebarSource.indexOf(`TOOLS_SIDEBAR_GROUP_LABELS[${index}]`));

    expect(labelUsePositions.every((position) => position >= 0)).toBe(true);
    expect(labelUsePositions).toEqual([...labelUsePositions].sort((a, b) => a - b));
  });

  it('keeps visual element and visual effect sections scoped to their responsibility', () => {
    expect(source('src/components/appearance/controls/VisualElements/VisualElements.jsx')).not.toContain('<VisualStyle');
    expect(source('src/components/appearance/Appearance.jsx')).not.toContain('<PerspectiveSection');
  });

  it('keeps expandable tool panels closed by default for scanability', () => {
    const expandableToolFiles = [
      'src/components/sidebar/MsaSidebarSection.jsx',
      'src/components/appearance/layout/TreeStructureGroup.jsx',
      'src/components/appearance/controls/VisualStyle/VisualStyle.jsx',
      'src/components/appearance/controls/VisualElements/VisualElements.jsx',
      'src/components/appearance/Appearance.jsx',
      'src/components/appearance/FocusHighlightingSection.jsx',
      'src/components/appearance/PivotEdgeEffectsSection.jsx',
      'src/components/TreeStatsPanel/TreeStatsPanel.tsx',
      'src/components/TreeStatsPanel/Shared/TaxaLegend.tsx',
    ];

    const defaultOpenFiles = expandableToolFiles
      .filter((file) => source(file).includes('defaultOpen'));

    expect(defaultOpenFiles).toEqual([]);
  });

  it('visually distinguishes an expanded sidebar tool from a closed one', () => {
    const sidebarSource = source('src/components/ui/sidebar.tsx');

    expect(sidebarSource).toContain('data-[state=open]:bg-sidebar-accent');
  });

  it('keeps sidebar scrolling vertical-only', () => {
    const sidebarSource = source('src/components/ui/sidebar.tsx');

    expect(sidebarSource).toContain('overflow-y-auto');
    expect(sidebarSource).toContain('overflow-x-hidden');
    expect(sidebarSource).not.toContain('flex min-h-0 flex-1 flex-col gap-2 overflow-auto');
  });

  it('uses one expandable-tool chevron convention', () => {
    const expandableToolFiles = [
      'src/components/sidebar/MsaSidebarSection.jsx',
      'src/components/appearance/layout/TreeStructureGroup.jsx',
      'src/components/appearance/controls/VisualStyle/VisualStyle.jsx',
      'src/components/appearance/controls/VisualElements/VisualElements.jsx',
      'src/components/appearance/Appearance.jsx',
      'src/components/appearance/FocusHighlightingSection.jsx',
      'src/components/appearance/PivotEdgeEffectsSection.jsx',
      'src/components/TreeStatsPanel/TreeStatsPanel.tsx',
      'src/components/TreeStatsPanel/Shared/TaxaLegend.tsx',
    ];

    const filesWithRightChevron = expandableToolFiles
      .filter((file) => source(file).includes('ChevronRight'));

    expect(filesWithRightChevron).toEqual([]);
  });
});
