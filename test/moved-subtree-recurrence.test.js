import { describe, it, expect } from 'vitest';
import * as sprAnalytics from '../src/domain/spr/sprAnalytics.js';

const { calculateSprMovedSubtreeRecurrences: calculateSubtreeRecurrences, formatSubtreeLabel } =
  sprAnalytics;

function toBackendSplitKey(split) {
  return `[${split
    .slice()
    .sort((a, b) => a - b)
    .join(', ')}]`;
}

function createSprEvent({ pivotEdge, driverSubtree, highlightGroup = [driverSubtree] }) {
  return {
    event_type: 'spr_move',
    pivot_edge: pivotEdge,
    driver_subtree: driverSubtree,
    highlight_group: highlightGroup,
    local_step_range: [0, 1],
    frame_range: [0, 1],
    collapse_hops: 1,
    expand_hops: 1,
    total_hops: 2,
    collapse_branch_length: 1,
    expand_branch_length: 1,
    total_branch_length: 2,
    collapse_path: pivotEdge,
    expand_path: pivotEdge,
  };
}

function createPairSolution(events) {
  const attachment_edges_by_split = {};

  events.forEach((event) => {
    const pivotKey = toBackendSplitKey(event.pivot_edge);
    const driverKey = toBackendSplitKey(event.driver_subtree);
    attachment_edges_by_split[pivotKey] = {
      ...(attachment_edges_by_split[pivotKey] || {}),
      [driverKey]: {
        source: event.pivot_edge,
        destination: event.pivot_edge,
      },
    };
  });

  return { attachment_edges_by_split };
}

function createAnalyticsInput(pairEvents) {
  const pairs = pairEvents.map(({ pairId, events }, pairOrdinal) => ({
    pair_id: pairId,
    pair_ordinal: pairOrdinal,
    source_frame_index: pairOrdinal * 2,
    target_frame_index: pairOrdinal * 2 + 1,
    source_input_tree_index: pairOrdinal,
    target_input_tree_index: pairOrdinal + 1,
    generated_frame_range: [pairOrdinal * 2 + 1, pairOrdinal * 2 + 1],
    solution: createPairSolution(events),
  }));

  const temporalEvents = pairEvents.flatMap(({ pairId, events }) =>
    events.map((event, eventIndex) => ({
      ...event,
      event_id: `${pairId}:spr:${eventIndex}`,
      pair_id: pairId,
    }))
  );

  return {
    pairs,
    temporalEvents,
    pairMetrics: {
      rows: pairs.map((pair) => ({
        pair_id: pair.pair_id,
        robinson_foulds: 1,
        weighted_robinson_foulds: 1,
      })),
    },
  };
}

describe('SPR moved subtree recurrences', () => {
  it('exports moved-subtree recurrence helpers without legacy frequency names', () => {
    expect(sprAnalytics.calculateSprMovedSubtreeRecurrences).toBeTypeOf('function');
    expect(sprAnalytics.getTopSprMovedSubtreeRecurrences).toBeTypeOf('function');
    expect(sprAnalytics.calculateSprMovedSubtreeFrequencies).toBeUndefined();
    expect(sprAnalytics.getTopSprMovedSubtrees).toBeUndefined();
    expect(sprAnalytics.calculateSprMoverFrequencies).toBeUndefined();
    expect(sprAnalytics.getTopSprMovers).toBeUndefined();
  });

  describe('calculateSubtreeRecurrences', () => {
    it('should require the normalized temporal contract', () => {
      expect(() => calculateSubtreeRecurrences(null)).toThrow();
      expect(() => calculateSubtreeRecurrences(undefined)).toThrow();
    });

    it('should return empty array when normalized input has no SPR move events', () => {
      const { pairs, temporalEvents, pairMetrics } = createAnalyticsInput([
        { pairId: 'pair_0_1', events: [] },
      ]);

      expect(calculateSubtreeRecurrences(pairs, { temporalEvents, pairMetrics })).toEqual([]);
    });

    it('should calculate recurrences from temporal_events spr_move rows', () => {
      const { pairs, temporalEvents, pairMetrics } = createAnalyticsInput([
        {
          pairId: 'pair_0_1',
          events: [
            createSprEvent({
              pivotEdge: [10, 11, 12, 13],
              driverSubtree: [13],
            }),
            createSprEvent({
              pivotEdge: [2, 3, 4, 5, 6],
              driverSubtree: [4],
            }),
            createSprEvent({
              pivotEdge: [2, 3, 4, 5, 6],
              driverSubtree: [6],
            }),
          ],
        },
        {
          pairId: 'pair_2_3',
          events: [
            createSprEvent({
              pivotEdge: [10, 11, 12, 13],
              driverSubtree: [13],
            }),
          ],
        },
      ]);

      const result = calculateSubtreeRecurrences(pairs, { temporalEvents, pairMetrics });

      // Expected:
      // [13] -> count 2 (appears in pair_0_1 and pair_2_3)
      // [4] -> count 1
      // [6] -> count 1

      expect(result).toHaveLength(3);

      // Check first item (most frequent)
      expect(result[0].splitIndices).toEqual([13]);
      expect(result[0].count).toBe(2);
      expect(result[0].percentage).toBe(50); // 2 out of 4 total

      // Check others
      const count1Items = result.filter((r) => r.count === 1);
      expect(count1Items).toHaveLength(2);
    });

    it('should handle multi-taxon subtrees', () => {
      const { pairs, temporalEvents, pairMetrics } = createAnalyticsInput([
        {
          pairId: 'pair_0_1',
          events: [
            createSprEvent({
              pivotEdge: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
              driverSubtree: [9, 10, 11, 12, 13],
            }),
          ],
        },
      ]);

      const result = calculateSubtreeRecurrences(pairs, { temporalEvents, pairMetrics });

      expect(result).toHaveLength(1);
      expect(result[0].splitIndices).toEqual([9, 10, 11, 12, 13]);
      expect(result[0].count).toBe(1);
    });

    it('should not infer recurrences from solution attachment data without temporal events', () => {
      const { pairs, temporalEvents, pairMetrics } = createAnalyticsInput([
        { pairId: 'pair_0_1', events: [] },
      ]);
      pairs[0].solution.attachment_edges_by_split = {
        '[10, 11, 12, 13]': {
          '[13]': {
            source: [10, 13],
            destination: [12, 13],
          },
        },
      };

      const result = calculateSubtreeRecurrences(pairs, { temporalEvents, pairMetrics });
      expect(result).toEqual([]);
    });
  });

  describe('formatSubtreeLabel', () => {
    it('should format subtrees with indices when no names provided', () => {
      expect(formatSubtreeLabel([1, 2])).toBe('Nodes: 1, 2');
      expect(formatSubtreeLabel([1, 2, 3])).toBe('Nodes: 1, 2, 3');
      expect(formatSubtreeLabel([1, 2, 3, 4])).toBe('Nodes: 1, 2, 3, 4');
    });

    it('should show all leaf names when provided', () => {
      const leaves = ['Zero', 'A', 'B', 'C', 'D', 'E'];
      // Indices: 1, 2 -> A, B
      expect(formatSubtreeLabel([1, 2], leaves)).toBe('A, B');

      // Indices: 1, 2, 3, 4 -> A, B, C, D (all names shown)
      expect(formatSubtreeLabel([1, 2, 3, 4], leaves)).toBe('A, B, C, D');

      // All indices
      expect(formatSubtreeLabel([0, 1, 2, 3, 4, 5], leaves)).toBe('Zero, A, B, C, D, E');
    });
  });
});
