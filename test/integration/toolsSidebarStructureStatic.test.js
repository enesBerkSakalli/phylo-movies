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
    expect(appSource).not.toContain("from './components/appearance/FocusAndChangeEffects.jsx'");
    expect(appSource).not.toContain(
      "from './components/appearance/controls/VisualElements/TaxaAndHighlightsSection.jsx'"
    );
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

    expect(TOOLS_SIDEBAR_GROUP_LABELS).toEqual(['Dataset', 'Layout', 'Style', 'Analysis', 'View']);
    const labelUsePositions = [0, 1, 2, 3, 4].map((index) =>
      sidebarSource.indexOf(`TOOLS_SIDEBAR_GROUP_LABELS[${index}]`)
    );

    expect(labelUsePositions.every((position) => position >= 0)).toBe(true);
    expect(labelUsePositions).toEqual([...labelUsePositions].sort((a, b) => a - b));
    expect(sidebarSource.indexOf('<TreeStructureGroup />')).toBeLessThan(
      sidebarSource.indexOf('<GeometryDimensionsSection />')
    );
    expect(sidebarSource.indexOf('<TaxaAndHighlightsSection')).toBeLessThan(
      sidebarSource.indexOf('<TreeStatsPanel />')
    );
    expect(sidebarSource.indexOf('<TreeStatsPanel />')).toBeLessThan(
      sidebarSource.indexOf('<ViewModeSection />')
    );
    expect(sidebarSource.indexOf('<ViewModeSection />')).toBeLessThan(
      sidebarSource.indexOf('<FocusAndChangeEffects />')
    );
  });

  it('uses the canonical Phylo-Movies app icon in the sidebar header', () => {
    const sidebarSource = source('src/components/sidebar/ToolsSidebar.jsx');

    expect(sidebarSource).toContain(
      "const phyloTreeIcon = `${import.meta.env.BASE_URL}icons/phylo-tree-icon.svg`"
    );
    expect(sidebarSource).toContain('src={phyloTreeIcon}');
    expect(sidebarSource).toContain('aria-label="Phylo-Movies"');
    expect(sidebarSource).not.toContain("'/icons/phylo-tree-icon.svg'");
    expect(sidebarSource).not.toContain('Film');
    expect(sidebarSource).not.toContain('bg-primary text-primary-foreground');
  });

  it('keeps app icon paths aware of the deployed base path', () => {
    expect(source('src/index.html')).toContain('%BASE_URL%icons/phylo-tree-icon.svg');
    expect(source('src/index.html')).toContain('%BASE_URL%icons/favicon-32.png');
    expect(source('src/index.html')).toContain('%BASE_URL%icons/favicon-16.png');
    expect(source('src/index.html')).toContain('%BASE_URL%icons/apple-touch-icon.png');
    expect(source('src/pages/Splash/splash.html')).toContain(
      '%BASE_URL%icons/phylo-tree-icon.svg'
    );
    expect(source('src/pages/Splash/SplashApp.jsx')).toContain(
      "const phyloTreeIcon = `${import.meta.env.BASE_URL}icons/phylo-tree-icon.svg`"
    );
    expect(source('src/pages/GitHubPages/GitHubPagesInfoPage.jsx')).toContain(
      "const phyloTreeIcon = `${import.meta.env.BASE_URL}icons/phylo-tree-icon.svg`"
    );

    const appShellFiles = [
      'src/index.html',
      'src/pages/Splash/splash.html',
      'src/pages/Splash/SplashApp.jsx',
      'src/pages/GitHubPages/GitHubPagesInfoPage.jsx',
      'src/components/sidebar/ToolsSidebar.jsx',
    ];

    for (const file of appShellFiles) {
      expect(source(file)).not.toContain('"/icons/phylo-tree-icon.svg"');
      expect(source(file)).not.toContain("'/icons/phylo-tree-icon.svg'");
      expect(source(file)).not.toContain('href="/icons/');
      expect(source(file)).not.toContain('src="/icons/');
    }
  });

  it('uses the shared deployed icon in the manual chrome', () => {
    const manualConfig = source('manual/docusaurus.config.js');
    const packageJson = JSON.parse(source('package.json'));

    expect(packageJson.scripts['manual:build']).toContain('npm run manual:prepare-assets');
    expect(packageJson.scripts['manual:prepare-assets']).toBe(
      'node scripts/prepare-manual-assets.mjs'
    );
    expect(source('scripts/prepare-manual-assets.mjs')).toContain(
      "'src', 'public', 'icons', 'phylo-tree-icon.svg'"
    );
    expect(source('scripts/prepare-manual-assets.mjs')).toContain(
      "'manual', 'static', 'icons'"
    );
    expect(manualConfig).toContain("favicon: 'icons/phylo-tree-icon.svg'");
    expect(manualConfig).toContain("alt: 'Phylo-Movies'");
    expect(manualConfig).toContain("src: 'icons/phylo-tree-icon.svg'");
  });

  it('keeps camera controls grouped with view effects rather than tree layout controls', () => {
    const sidebarSource = source('src/components/sidebar/ToolsSidebar.jsx');
    const layoutGroupStart = sidebarSource.indexOf('TOOLS_SIDEBAR_GROUP_LABELS[1]');
    const styleGroupStart = sidebarSource.indexOf('TOOLS_SIDEBAR_GROUP_LABELS[2]');
    const viewGroupStart = sidebarSource.indexOf('TOOLS_SIDEBAR_GROUP_LABELS[4]');
    const layoutGroupSource = sidebarSource.slice(layoutGroupStart, styleGroupStart);
    const viewGroupSource = sidebarSource.slice(viewGroupStart);

    expect(layoutGroupSource).not.toContain('<ViewModeSection />');
    expect(viewGroupSource).toContain('<ViewModeSection />');
  });

  it('keeps visual element and visual effect sections scoped to their responsibility', () => {
    expect(
      source('src/components/appearance/controls/VisualElements/TaxaAndHighlightsSection.jsx')
    ).not.toContain('<VisualStyle');
    expect(source('src/components/appearance/FocusAndChangeEffects.jsx')).not.toContain(
      '<PerspectiveSection'
    );
  });

  it('keeps expandable tool panels closed by default for scanability', () => {
    const expandableToolFiles = [
      'src/components/sidebar/MsaSidebarSection.jsx',
      'src/components/appearance/layout/TreeStructureGroup.jsx',
      'src/components/appearance/controls/VisualStyle/VisualStyle.jsx',
      'src/components/appearance/controls/VisualElements/TaxaAndHighlightsSection.jsx',
      'src/components/appearance/FocusAndChangeEffects.jsx',
      'src/components/appearance/FocusHighlightingSection.jsx',
      'src/components/appearance/PivotEdgeEffectsSection.jsx',
      'src/components/TreeStatsPanel/TreeStatsPanel.tsx',
      'src/components/TreeStatsPanel/Shared/TaxaLegend.tsx',
    ];

    const defaultOpenFiles = expandableToolFiles.filter((file) =>
      source(file).includes('defaultOpen')
    );

    expect(defaultOpenFiles).toEqual([]);
  });

  it('visually distinguishes an expanded sidebar tool from a closed one', () => {
    const sidebarSource = source('src/components/ui/sidebar.tsx');

    expect(sidebarSource).toContain('data-[state=open]:bg-sidebar-accent');
  });

  it('uses a heavier desktop sidebar edge divider', () => {
    const sidebarSource = source('src/components/ui/sidebar.tsx');

    expect(sidebarSource).toContain('border-sidebar-border');
    expect(sidebarSource).toContain('group-data-[side=left]:border-r-2');
    expect(sidebarSource).toContain('group-data-[side=right]:border-l-2');
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
      'src/components/appearance/controls/VisualElements/TaxaAndHighlightsSection.jsx',
      'src/components/appearance/FocusAndChangeEffects.jsx',
      'src/components/appearance/FocusHighlightingSection.jsx',
      'src/components/appearance/PivotEdgeEffectsSection.jsx',
      'src/components/TreeStatsPanel/TreeStatsPanel.tsx',
      'src/components/TreeStatsPanel/Shared/TaxaLegend.tsx',
    ];

    const filesWithRightChevron = expandableToolFiles.filter((file) =>
      source(file).includes('ChevronRight')
    );

    expect(filesWithRightChevron).toEqual([]);
  });
});
