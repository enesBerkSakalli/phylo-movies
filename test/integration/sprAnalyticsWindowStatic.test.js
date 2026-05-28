import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { ANALYTICS_WINDOW_BOUNDS } from '../../src/components/TreeStatsPanel/AnalyticsDashboard.contract';
import { SPR_MOVE_EVENT_TABLE_COPY } from '../../src/components/TreeStatsPanel/SubtreeAnalytics/SprMoveEventTable.contract';

describe('SPR analytics window shell', () => {
  it('uses a draggable RND analysis window, not a modal dialog', () => {
    const dashboardSource = fs.readFileSync(
      path.join(process.cwd(), 'src/components/TreeStatsPanel/AnalyticsDashboard.tsx'),
      'utf8'
    );
    const layerSource = fs.readFileSync(
      path.join(process.cwd(), 'src/components/ui/floating-window-layer.js'),
      'utf8'
    );
    const appSource = fs.readFileSync(path.join(process.cwd(), 'src/App.jsx'), 'utf8');

    expect(dashboardSource).toContain("import { Rnd } from 'react-rnd'");
    expect(dashboardSource).toContain('dragHandleClassName="spr-analytics-drag-handle"');
    expect(dashboardSource).toContain('bounds="window"');
    expect(dashboardSource).toContain('getFloatingWindowLayerClass');
    expect(layerSource).toContain('z-[1200]');
    expect(dashboardSource).not.toContain('../ui/dialog');
    expect(dashboardSource).not.toContain('<Dialog');
    expect(dashboardSource).not.toContain('DialogContent');
    expect(appSource).not.toContain('spr-analytics-panel-root');
    expect(appSource).toContain('sprAnalyticsOpen');
  });

  it('keeps the move ledger compact enough for the default analysis window', () => {
    const tableSource = fs.readFileSync(
      path.join(
        process.cwd(),
        'src/components/TreeStatsPanel/SubtreeAnalytics/SprMoveEventTable.tsx'
      ),
      'utf8'
    );

    expect(ANALYTICS_WINDOW_BOUNDS.minWidth).toBeGreaterThanOrEqual(620);
    expect(SPR_MOVE_EVENT_TABLE_COPY.minWidthClassName).toBe('min-w-[1040px]');
    expect(SPR_MOVE_EVENT_TABLE_COPY.metrics.rfDistance).toBe('RF Distance');
    expect(SPR_MOVE_EVENT_TABLE_COPY.metrics.weightedRf).toBe('Weighted RF');
    expect(tableSource).toContain('VIRTUAL_ROW_HEIGHT');
    expect(tableSource).toContain('visibleEventRows.map');
    expect(tableSource).toContain('aria-rowcount={filteredEventRows.length}');
    expect(tableSource).toContain('bg-card text-muted-foreground font-bold shadow-sm');
    expect(tableSource).toContain('getBranchValueFilterOptions');
    expect(tableSource).toContain('event.branchValueClass === subtreeBranchValueFilter');
    expect(tableSource).toContain('event.contextBranchValueClass === contextBranchValueFilter');
    expect(tableSource).toContain('SelectTrigger');
    expect(tableSource).toContain('branchValueThresholdInput');
    expect(tableSource).toContain('onBranchValueThresholdChange');
    expect(tableSource).toContain('sourceMovedSubtreeBranchValue');
    expect(tableSource).toContain('sourceAncestorBranchValue');
    expect(tableSource).toContain('branchValueRows.nearestAncestor');
    expect(tableSource).not.toContain('bg-muted/40 text-muted-foreground font-bold sticky');
  });

  it('uses direct indexed filtering for the SPR move ledger search', () => {
    const tableSource = fs.readFileSync(
      path.join(
        process.cwd(),
        'src/components/TreeStatsPanel/SubtreeAnalytics/SprMoveEventTable.tsx'
      ),
      'utf8'
    );

    expect(tableSource).not.toContain('@tanstack/react-table');
    expect(tableSource).not.toContain('columns.pair');
    expect(tableSource).toContain(
      'buildSprMoveEventSearchText(event, leafNamesByIndex, windowRangeOptions)'
    );
    expect(tableSource).toContain('queryTerms.every((term) => searchText.includes(term))');
    expect(SPR_MOVE_EVENT_TABLE_COPY.searchLabel).toBe('Search SPR moves');
    expect(SPR_MOVE_EVENT_TABLE_COPY.noSearchResults).toBe('No SPR moves match these filters.');
    expect(SPR_MOVE_EVENT_TABLE_COPY.branchValueThresholdLabel).toBe('Value threshold');
    expect(SPR_MOVE_EVENT_TABLE_COPY.subtreeValueFilterLabel).toBe(
      'Filter SPR moves by moved-subtree branch value category'
    );
    expect(SPR_MOVE_EVENT_TABLE_COPY.contextValueFilterLabel).toBe(
      'Filter SPR moves by placement-context branch value category'
    );
    expect(SPR_MOVE_EVENT_TABLE_COPY.branchValueFilters.bothHigh).toBe(
      '{target} both >= {threshold}'
    );
    expect(SPR_MOVE_EVENT_TABLE_COPY.branchValueClasses.bothHigh).toBe(
      'moved subtree values both >= {threshold}'
    );
  });

  it('mounts expensive SPR analytics only inside the open floating window', () => {
    const dashboardSource = fs.readFileSync(
      path.join(process.cwd(), 'src/components/TreeStatsPanel/AnalyticsDashboard.tsx'),
      'utf8'
    );
    const shellSource = dashboardSource.slice(
      dashboardSource.indexOf('export const AnalyticsDashboard'),
      dashboardSource.indexOf('const AnalyticsDashboardBody')
    );

    expect(dashboardSource).toContain('const AnalyticsDashboardBody = () =>');
    expect(dashboardSource).toContain('if (!isOpen || !portalRoot) return null;');
    expect(dashboardSource).toContain('return createPortal(');
    expect(dashboardSource).toContain('<AnalyticsDashboardBody />');
    expect(dashboardSource).toContain('branchValueThreshold={branchValueThreshold}');
    expect(dashboardSource).toContain('onBranchValueThresholdChange={setBranchValueThreshold}');
    expect(dashboardSource).not.toContain('const eventCsvContent = useMemo');
    expect(dashboardSource).not.toContain('const recurrenceCsvContent = useMemo');
    expect(shellSource).not.toContain('useAppStore(');
    expect(shellSource).not.toContain('buildSprAnalyticsModel');
    expect(dashboardSource).not.toContain('MovedSubtreeRecurrenceChart');
  });
});
