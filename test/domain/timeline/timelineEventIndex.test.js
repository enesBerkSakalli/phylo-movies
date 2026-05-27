import { describe, expect, it } from 'vitest';
import { TimelineEventIndex } from '../../../src/timeline/data/TimelineEventIndex.js';

const pairs = [
  { pair_id: 'pair_0_1', pair_ordinal: 0 },
  { pair_id: 'pair_1_2', pair_ordinal: 1 },
];

const temporalEvents = [
  {
    event_id: 'pair_0_1:spr:1',
    event_type: 'spr_move',
    pair_id: 'pair_0_1',
    pair_ordinal: 0,
    frame_range: [1, 1],
  },
  {
    event_id: 'pair_0_1:split:0',
    event_type: 'split_change',
    pair_id: 'pair_0_1',
    pair_ordinal: 0,
    frame_range: [1, 1],
  },
  {
    event_id: 'pair_0_1:spr:0',
    event_type: 'spr_move',
    pair_id: 'pair_0_1',
    pair_ordinal: 0,
    frame_range: [1, 1],
  },
];

describe('TimelineEventIndex', () => {
  it('groups semantic temporal events by pair and event type in frame order', () => {
    const index = TimelineEventIndex.from({ pairs, temporalEvents });

    expect(index.getEventsForPair('pair_0_1', 'spr_move').map((event) => event.event_id)).toEqual([
      'pair_0_1:spr:0',
      'pair_0_1:spr:1',
    ]);
    expect(
      index.getEventsForPair('pair_0_1', 'split_change').map((event) => event.event_id)
    ).toEqual(['pair_0_1:split:0']);
    expect(index.getEventsForPair('pair_1_2', 'spr_move')).toEqual([]);
  });

  it('counts semantic events without reading playback timing intervals', () => {
    const index = TimelineEventIndex.from({ pairs, temporalEvents });

    expect(index.countEventsForPair('pair_0_1', 'spr_move')).toBe(2);
    expect(index.countEventsForPair('pair_0_1', 'split_change')).toBe(1);
    expect(index.countEventsForPair('pair_1_2', 'split_change')).toBe(0);
  });
});
