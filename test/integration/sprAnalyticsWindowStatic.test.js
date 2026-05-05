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
    expect(dashboardSource).not.toContain('@/components/ui/dialog');
    expect(dashboardSource).not.toContain('<Dialog');
    expect(dashboardSource).not.toContain('DialogContent');
    expect(appSource).not.toContain('spr-analytics-panel-root');
    expect(appSource).toContain('sprAnalyticsOpen');
  });
});
