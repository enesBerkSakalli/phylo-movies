import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

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
    const tableSource = fs.readFileSync(
      path.join(process.cwd(), 'src/components/TreeStatsPanel/SubtreeAnalytics/SprMoveEventTable.tsx'),
      'utf8',
    );

    expect(tableSource).toContain('min-w-[820px]');
    expect(tableSource).not.toContain('min-w-[1180px]');
    expect(tableSource).toContain('RF Distance');
    expect(tableSource).toContain('Weighted RF');
  });

  it('uses TanStack global filtering for the SPR move ledger search', () => {
    const tableSource = fs.readFileSync(
      path.join(process.cwd(), 'src/components/TreeStatsPanel/SubtreeAnalytics/SprMoveEventTable.tsx'),
      'utf8',
    );

    expect(tableSource).toContain("@tanstack/react-table");
    expect(tableSource).toContain("getFilteredRowModel");
    expect(tableSource).toContain("Search movements");
    expect(tableSource).toContain("No movements match this search.");
  });
});
