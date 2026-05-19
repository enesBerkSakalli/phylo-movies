import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { ANALYTICS_WINDOW_BOUNDS } from '../../src/components/TreeStatsPanel/AnalyticsDashboard.contract';
import { SPR_MOVE_EVENT_TABLE_COPY } from '../../src/components/TreeStatsPanel/SubtreeAnalytics/SprMoveEventTable.contract';

describe('SPR analytics window shell', () => {
  it('uses a draggable RND analysis window, not a modal dialog', () => {
    const dashboardSource = fs.readFileSync(
      path.join(process.cwd(), 'src/components/TreeStatsPanel/AnalyticsDashboard.tsx'),
      'utf8',
    );
    const appSource = fs.readFileSync(
      path.join(process.cwd(), 'src/App.jsx'),
      'utf8',
    );

    expect(dashboardSource).toContain("import { Rnd } from 'react-rnd'");
    expect(dashboardSource).toContain('dragHandleClassName="spr-analytics-drag-handle"');
    expect(dashboardSource).toContain('bounds="window"');
    expect(dashboardSource).toContain('z-[1200]');
    expect(dashboardSource).not.toContain('../ui/dialog');
    expect(dashboardSource).not.toContain('<Dialog');
    expect(dashboardSource).not.toContain('DialogContent');
    expect(appSource).not.toContain('spr-analytics-panel-root');
    expect(appSource).toContain('sprAnalyticsOpen');
  });

  it('keeps the move ledger compact enough for the default analysis window', () => {
    expect(ANALYTICS_WINDOW_BOUNDS.minWidth).toBeGreaterThanOrEqual(620);
    expect(SPR_MOVE_EVENT_TABLE_COPY.minWidthClassName).toBe('min-w-[820px]');
    expect(SPR_MOVE_EVENT_TABLE_COPY.metrics.rfDistance).toBe('RF Distance');
    expect(SPR_MOVE_EVENT_TABLE_COPY.metrics.weightedRf).toBe('Weighted RF');
  });

  it('uses TanStack global filtering for the SPR move ledger search', () => {
    const tableSource = fs.readFileSync(
      path.join(process.cwd(), 'src/components/TreeStatsPanel/SubtreeAnalytics/SprMoveEventTable.tsx'),
      'utf8',
    );

    expect(tableSource).toContain("@tanstack/react-table");
    expect(tableSource).toContain("globalFilterFn");
    expect(tableSource).toContain("getFilteredRowModel");
    expect(SPR_MOVE_EVENT_TABLE_COPY.searchLabel).toBe('Search movements');
    expect(SPR_MOVE_EVENT_TABLE_COPY.noSearchResults).toBe('No movements match this search.');
  });
});
