import { describe, expect, it } from 'vitest';
import { groupEvents } from '../../../../src/timeline/data/groupEvents.js';

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

describe('groupEvents', () => {
  it('groups semantic temporal events by pair and event type in frame order', () => {
    const eventsOf = groupEvents(pairs, temporalEvents);

    expect(eventsOf('pair_0_1', 'spr_move').map((event) => event.event_id)).toEqual([
      'pair_0_1:spr:0',
      'pair_0_1:spr:1',
    ]);
    expect(eventsOf('pair_0_1', 'split_change').map((event) => event.event_id)).toEqual([
      'pair_0_1:split:0',
    ]);
    expect(eventsOf('pair_1_2', 'spr_move')).toEqual([]);
  });
});
