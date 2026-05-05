import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('SPR analytics window shell', () => {
  it('uses a docked analysis panel, not a modal dialog or canvas overlay', () => {
    const dashboardSource = fs.readFileSync(
      path.join(process.cwd(), 'src/components/TreeStatsPanel/AnalyticsDashboard.tsx'),
      'utf8',
    );
    const appSource = fs.readFileSync(
      path.join(process.cwd(), 'src/App.jsx'),
      'utf8',
    );

    expect(dashboardSource).not.toContain("import { Rnd } from 'react-rnd'");
    expect(dashboardSource).not.toContain('@/components/ui/dialog');
    expect(dashboardSource).not.toContain('<Dialog');
    expect(dashboardSource).not.toContain('DialogContent');
    expect(appSource).toContain('spr-analytics-panel-root');
    expect(appSource).toContain('sprAnalyticsOpen');
  });
});
