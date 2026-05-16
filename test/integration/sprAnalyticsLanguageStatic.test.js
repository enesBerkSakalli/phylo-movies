import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const SPR_FILES = [
  'src/components/TreeStatsPanel/AnalyticsDashboard.tsx',
  'src/components/TreeStatsPanel/SubtreeAnalytics/SprSummaryMetrics.tsx',
  'src/components/TreeStatsPanel/SubtreeAnalytics/MovedSubtreeRecurrenceTable.tsx',
  'src/components/TreeStatsPanel/SubtreeAnalytics/SprMoveEventTable.tsx',
  'src/components/TreeStatsPanel/SubtreeAnalytics/SprActivityTimeline.tsx',
  'src/components/TreeStatsPanel/SubtreeAnalytics/MovedSubtreeRecurrenceList.tsx',
  'src/components/TreeStatsPanel/SubtreeAnalytics/MovedSubtreeRecurrenceChart.tsx',
  'src/components/TreeStatsPanel/SubtreeAnalytics/sprAnalyticsCsv.ts',
  'src/components/appearance/color/ColoringPanel.jsx',
  'src/components/appearance/FocusHighlightingSection.jsx',
];

describe('SPR analytics phylogenetic language', () => {
  it('uses subtree terminology instead of generic group labels', () => {
    const source = SPR_FILES
      .map((file) => fs.readFileSync(path.join(process.cwd(), file), 'utf8'))
      .join('\n');

    [
      'Moved Group',
      'Moved Groups',
      'moved group',
      'moved groups',
      'Unique groups',
      'Unique Moved Groups',
      'Recurrent Groups',
      'Recurrent Moved Groups',
      'Top Group Share',
      'Farthest Group',
      'Groups That Move Most Often',
    ].forEach((phrase) => {
      expect(source).not.toContain(phrase);
    });

    expect(source).toContain('Moved Subtree');
    expect(source).toContain('Recurrent Subtrees');
  });

  it('uses movement terminology instead of exposing event-ledger setup in the UI', () => {
    const dashboardSource = fs.readFileSync(
      path.join(process.cwd(), 'src/components/TreeStatsPanel/AnalyticsDashboard.tsx'),
      'utf8',
    );
    const summarySource = fs.readFileSync(
      path.join(process.cwd(), 'src/components/TreeStatsPanel/SubtreeAnalytics/SprSummaryMetrics.tsx'),
      'utf8',
    );
    const tableSource = fs.readFileSync(
      path.join(process.cwd(), 'src/components/TreeStatsPanel/SubtreeAnalytics/SprMoveEventTable.tsx'),
      'utf8',
    );
    const timelineTooltipSource = fs.readFileSync(
      path.join(process.cwd(), 'src/components/timeline/TimelineSegmentTooltip.jsx'),
      'utf8',
    );

    expect(dashboardSource).toContain('<span>Moving Subtrees</span>');
    expect(dashboardSource).toContain('Quantifies which taxa or clades change attachment across neighboring trees.');
    expect(dashboardSource).toContain('TabsTrigger value="events"');
    expect(dashboardSource).toContain('>Movement Events</TabsTrigger>');
    expect(dashboardSource).toContain('A movement is one subtree that changes attachment between two neighboring trees.');
    expect(dashboardSource).not.toContain('event ledger');
    expect(dashboardSource).not.toContain('backend driver subtree');

    expect(summarySource).toContain('label="Movement Events"');
    expect(summarySource).not.toContain('label="SPR Movements"');
    expect(summarySource).not.toContain('label="SPR Move Events"');

    expect(tableSource).toContain('aria-label="Search movements"');
    expect(tableSource).toContain('No movements match this search.');
    expect(tableSource).toContain('>Movement</th>');
    expect(tableSource).not.toContain('Search SPR move events');

    expect(timelineTooltipSource).toContain('Moved subtrees');
    expect(timelineTooltipSource).not.toContain('Moved groups');
  });

  it('makes the main recurrent-subtree table highlightable like the sidebar summary', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'src/components/TreeStatsPanel/SubtreeAnalytics/MovedSubtreeRecurrenceTable.tsx'),
      'utf8',
    );

    expect(source).toContain('selectSetManuallyMarkedNodes');
    expect(source).toContain('onClick={() => handleSubtreeClick(item.splitIndices)}');
    expect(source).toContain('onKeyDown=');
    expect(source).toContain('aria-pressed={isActive}');
  });
});
