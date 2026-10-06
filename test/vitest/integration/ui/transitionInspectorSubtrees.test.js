// @vitest-environment jsdom
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { TransitionInspectorPanel } from '../../../../src/components/TransitionInspectorPanel.jsx';
import { useAppStore } from '../../../../src/state/phyloStore/store.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const inputTree = { isInputTreeSegment: true, originalTreeIndex: 0, globalIndex: 0 };
const transition = {
  isInputTreeSegment: false,
  pairId: 'pair_0_1',
  pairOrdinal: 0,
  sourceInputTreeIndex: 0,
  targetInputTreeIndex: 1,
  sourceGlobalIndex: 0,
  targetGlobalIndex: 3,
  globalStart: 1,
  globalEnd: 2,
  localStepStart: 0,
  firstFrame: 0,
  lastFrame: 3,
  pivotEdge: [],
  subtreeMoveCount: 3,
  affectedSubtrees: [[0, 1, 2]],
};

describe('transition inspector', () => {
  let root;
  afterEach(async () => {
    await act(async () => root.unmount());
    document.body.innerHTML = '';
  });

  async function render({ selected = null, playheadSegment = null }) {
    useAppStore.setState({
      timeline: { segments: [inputTree, transition] },
      selectedTimelineSegmentIndex: selected,
      timelineCursor: playheadSegment === null ? null : { segmentIndex: playheadSegment },
      leafNamesByIndex: ['GreatRhea', 'LesserRhea', 'Ostrich'],
      pairChanges: { byPairId: new Map() },
    });
    const container = document.body.appendChild(document.createElement('div'));
    root = createRoot(container);
    await act(async () => root.render(React.createElement(TransitionInspectorPanel)));
    return container;
  }

  it('lists every taxon of a moved subtree, where the hover tooltip abbreviates', async () => {
    const container = await render({ selected: 1 });

    expect(container.textContent).toContain('GreatRhea, LesserRhea, Ostrich');
  });

  it('follows the transition under the playhead when nothing is selected, and says so', async () => {
    const container = await render({ playheadSegment: 1 });

    expect(container.textContent).toContain('Tree 1 → Tree 2');
    expect(container.textContent).toContain(
      'Following the playhead · select a transition to keep it'
    );
  });

  it('stays on the selection while the playhead is elsewhere, with nothing to say about it', async () => {
    const container = await render({ selected: 1, playheadSegment: 0 });

    expect(container.textContent).toContain('Tree 1 → Tree 2');
    expect(container.textContent).not.toContain('Following the playhead');
  });

  it('is empty on an input tree when nothing is selected', async () => {
    const container = await render({ playheadSegment: 0 });

    expect(container.textContent).toContain('Select a timeline segment');
    expect(container.textContent).not.toContain('Following the playhead');
  });
});
