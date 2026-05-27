import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = dirname(dirname(dirname(fileURLToPath(import.meta.url))));

const strictContractFiles = [
  'src/timeline/data/TimelineFrameView.js',
  'src/timeline/data/TimelineDataProcessor.js',
  'src/timeline/data/TimelineDataset.js',
  'src/timeline/data/TimelineEventIndex.js',
  'src/timeline/data/TimelineSegmentBuilder.js',
  'src/timeline/data/TimelineTimingBuilder.js',
  'src/domain/spr/sprAnalytics.js',
  'src/state/phyloStore/slices/dataset/datasetLifecycle.slice.js',
];

const targetedContractChecks = [
  {
    file: 'src/domain/spr/sprAnalytics.js',
    snippets: [
      'robinsonFouldsDistances',
      'weightedRobinsonFouldsDistances',
      'pairInterpolationRanges',
    ],
  },
  {
    file: 'engine/BranchArchitect/webapp/services/trees/frontend_builder.py',
    snippets: ['_parse_pair_id'],
  },
  {
    file: 'src/components/TreeStatsPanel/AnalyticsDashboard.tsx',
    snippets: [
      'selectDistanceRfd',
      'selectDistanceWeightedRfd',
      'robinsonFouldsDistances',
      'weightedRobinsonFouldsDistances',
    ],
  },
  {
    file: 'src/components/DistanceChart/DistanceChart.jsx',
    snippets: [
      'selectDistanceRfd',
      'selectDistanceWeightedRfd',
      'robinsonFouldsDistances',
      'weightedRobinsonFouldsDistances',
      'movieTimelineManager',
    ],
  },
  {
    file: 'src/components/DistanceChart/distanceChartModel.js',
    snippets: [
      'robinsonFouldsDistances',
      'weightedRobinsonFouldsDistances',
      'getFrameIndexForDistanceIndex',
    ],
  },
  {
    file: 'src/components/TransitionInspectorPanel.jsx',
    snippets: [
      'selectDistanceRfd',
      'selectDistanceWeightedRfd',
      'distanceRfd',
      'distanceWeightedRfd',
    ],
  },
  {
    file: 'src/timeline/data/TimelineDataset.js',
    snippets: ['getFrameIndexForDistanceIndex'],
  },
  {
    file: 'src/timeline/core/MovieTimelineManager.js',
    snippets: ['getFrameIndexForDistanceIndex'],
  },
  {
    file: 'src/timeline/core/TimelineStateSynchronizer.js',
    snippets: ['getTargetFrameForTime'],
  },
  {
    file: 'src/timeline/core/TimelineScrubController.js',
    snippets: ['getTargetFrameForTime'],
  },
  {
    file: 'src/timeline/core/TimelineNavigationController.js',
    snippets: ['getTargetFrameForTime'],
  },
];

const forbiddenCompatibilitySnippets = [
  'movieData?.',
  'Array.isArray(movieData',
  'if (!Array.isArray',
  '?? []',
  '|| []',
  'return []',
  'continue;',
  'typeof pairId ===',
  'parsePair',
  'tree_metadata',
  'tree_pair_solutions',
  'split_change_timeline',
  'pair_interpolation_ranges',
  'source_tree_global_index',
  'step_in_pair',
];

describe('normalized temporal contract', () => {
  it('names the frontend timeline row projection as frame views', () => {
    const frameViewSource = readFileSync(
      join(repoRoot, 'src/timeline/data/TimelineFrameView.js'),
      'utf8'
    );
    const datasetSource = readFileSync(
      join(repoRoot, 'src/timeline/data/TimelineDataset.js'),
      'utf8'
    );

    expect(frameViewSource).toContain('buildTimelineFrameViews');
    expect(datasetSource).toContain('frameViews');
    expect(datasetSource).not.toContain('frameRows');
  });

  it('does not keep compatibility or defensive fallback code in the temporal path', () => {
    const strictOffenders = strictContractFiles.flatMap((file) => {
      const absolutePath = join(repoRoot, file);
      const source = readFileSync(absolutePath, 'utf8');

      return forbiddenCompatibilitySnippets
        .filter((snippet) => source.includes(snippet))
        .map((snippet) => `${relative(repoRoot, absolutePath)}: ${snippet}`);
    });

    const targetedOffenders = targetedContractChecks.flatMap(({ file, snippets }) => {
      const absolutePath = join(repoRoot, file);
      const source = readFileSync(absolutePath, 'utf8');

      return snippets
        .filter((snippet) => source.includes(snippet))
        .map((snippet) => `${relative(repoRoot, absolutePath)}: ${snippet}`);
    });

    const offenders = [...strictOffenders, ...targetedOffenders];

    expect(offenders).toEqual([]);
  });
});
