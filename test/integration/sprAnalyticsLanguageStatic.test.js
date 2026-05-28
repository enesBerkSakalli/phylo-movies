import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { SPR_ANALYTICS_COPY } from '../../src/components/TreeStatsPanel/AnalyticsDashboard.contract';
import { SPR_SUMMARY_LABELS } from '../../src/components/TreeStatsPanel/SubtreeAnalytics/SprSummaryMetrics.contract';
import { SPR_MOVE_EVENT_TABLE_COPY } from '../../src/components/TreeStatsPanel/SubtreeAnalytics/SprMoveEventTable.contract';

const SPR_FILES = [
  'src/components/TreeStatsPanel/AnalyticsDashboard.contract.ts',
  'src/components/TreeStatsPanel/AnalyticsDashboard.tsx',
  'src/components/TreeStatsPanel/SubtreeAnalytics/SprMoveEventTable.contract.ts',
  'src/components/TreeStatsPanel/SubtreeAnalytics/SprSummaryMetrics.tsx',
  'src/components/TreeStatsPanel/SubtreeAnalytics/SprSummaryMetrics.contract.ts',
  'src/components/TreeStatsPanel/SubtreeAnalytics/MovedSubtreeRecurrenceTable.tsx',
  'src/components/TreeStatsPanel/SubtreeAnalytics/SprMoveEventTable.tsx',
  'src/components/TreeStatsPanel/SubtreeAnalytics/sprAnalyticsCsv.ts',
  'src/components/appearance/color/ColoringPanel.jsx',
  'src/components/appearance/FocusHighlightingSection.jsx',
];

function collectCopyText(value) {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(collectCopyText).join('\n');
  if (typeof value === 'object') return Object.values(value).map(collectCopyText).join('\n');
  return String(value);
}

describe('SPR analytics phylogenetic language', () => {
  it('uses subtree terminology instead of generic group labels', () => {
    const source = SPR_FILES.map((file) =>
      fs.readFileSync(path.join(process.cwd(), file), 'utf8')
    ).join('\n');

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

    expect([
      SPR_ANALYTICS_COPY.title,
      SPR_ANALYTICS_COPY.tabs.details,
      SPR_MOVE_EVENT_TABLE_COPY.columns.movedSubtree,
    ]).toEqual(['Moved Subtrees', 'Recurrent Subtrees', 'Moved Subtree']);
  });

  it('uses SPR move terminology instead of exposing event-ledger setup in the UI', () => {
    const timelineTooltipSource = fs.readFileSync(
      path.join(process.cwd(), 'src/components/timeline/TimelineSegmentTooltip.jsx'),
      'utf8'
    );

    expect(SPR_ANALYTICS_COPY).toMatchObject({
      title: 'Moved Subtrees',
      description: 'Quantifies which taxa or subtrees change attachment across neighboring trees.',
      countedDescription:
        'An SPR move is one moved subtree that changes attachment between two neighboring trees. Each row shows the moved subtree, its source attachment, and its target attachment.',
      eventDescription:
        'One row per SPR move, showing the moved subtree, pivot edge, source and target attachments, and source-to-target values for the selected branch annotation.',
    });
    expect(SPR_ANALYTICS_COPY.tabs.events).toBe('SPR Moves');
    const analyticsCopyText = collectCopyText(SPR_ANALYTICS_COPY);
    expect(analyticsCopyText).not.toContain('event ledger');
    expect(analyticsCopyText).not.toContain('backend driver subtree');

    expect(SPR_SUMMARY_LABELS.movementEvents).toBe('SPR Moves');
    expect(Object.values(SPR_SUMMARY_LABELS)).not.toContain('SPR Movements');
    expect(Object.values(SPR_SUMMARY_LABELS)).not.toContain('SPR Move Events');

    expect(SPR_MOVE_EVENT_TABLE_COPY.searchLabel).toBe('Search SPR moves');
    expect(SPR_MOVE_EVENT_TABLE_COPY.noSearchResults).toBe('No SPR moves match these filters.');
    expect(SPR_MOVE_EVENT_TABLE_COPY.columns.movement).toBe('SPR Move');
    expect(SPR_MOVE_EVENT_TABLE_COPY.columns).not.toHaveProperty('pair');
    expect(collectCopyText(SPR_MOVE_EVENT_TABLE_COPY)).not.toContain('High conflict');

    expect(timelineTooltipSource).toContain('Affected subtrees');
    expect(timelineTooltipSource).not.toContain('Moved groups');
    expect(timelineTooltipSource).not.toContain('Moved subtrees');
  });

  it('keeps the overview metrics focused on decision-level counts', () => {
    expect(SPR_SUMMARY_LABELS).toEqual({
      uniqueMovedSubtrees: 'Unique Moved Subtrees',
      movementEvents: 'SPR Moves',
      treePairsWithMoves: 'Tree Pairs With Moves',
    });

    const overviewSource = fs.readFileSync(
      path.join(
        process.cwd(),
        'src/components/TreeStatsPanel/SubtreeAnalytics/SprSummaryMetrics.tsx'
      ),
      'utf8'
    );

    [
      'Solver Steps',
      'Single-Taxon Moves',
      'Top Subtree Share',
      'Path Hops',
      'Path Length',
      'Farthest Subtree',
    ].forEach((removedMetric) => {
      expect(overviewSource).not.toContain(removedMetric);
    });
  });

  it('makes the main recurrent-subtree table highlightable like the sidebar summary', () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        'src/components/TreeStatsPanel/SubtreeAnalytics/MovedSubtreeRecurrenceTable.tsx'
      ),
      'utf8'
    );

    expect(source).toContain('selectSetManuallyMarkedNodes');
    expect(source).toContain('onClick={() => handleSubtreeClick(item.splitIndices)}');
    expect(source).toContain('onKeyDown=');
    expect(source).toContain('aria-pressed={isActive}');
  });
});
