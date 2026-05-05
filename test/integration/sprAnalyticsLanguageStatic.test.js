import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const SPR_FILES = [
  'src/components/TreeStatsPanel/AnalyticsDashboard.tsx',
  'src/components/TreeStatsPanel/SubtreeAnalytics/SprSummaryMetrics.tsx',
  'src/components/TreeStatsPanel/SubtreeAnalytics/SprFrequencyTable.tsx',
  'src/components/TreeStatsPanel/SubtreeAnalytics/SprMoveEventTable.tsx',
  'src/components/TreeStatsPanel/SubtreeAnalytics/SprActivityTimeline.tsx',
  'src/components/TreeStatsPanel/SubtreeAnalytics/SubtreeFrequencyList.tsx',
  'src/components/TreeStatsPanel/SubtreeAnalytics/SubtreeFrequencyBarChart.tsx',
  'src/components/TreeStatsPanel/SubtreeAnalytics/sprFrequencyCsv.ts',
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
});
