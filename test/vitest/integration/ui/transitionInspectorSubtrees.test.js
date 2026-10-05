// @vitest-environment jsdom
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { TransitionInspectorPanel } from '../../../../src/components/TransitionInspectorPanel.jsx';
import { useAppStore } from '../../../../src/state/phyloStore/store.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('transition inspector', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('lists every taxon of a moved subtree, where the hover tooltip abbreviates', async () => {
    const segment = {
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
    useAppStore.setState({
      timeline: { segments: [segment] },
      selectedTimelineSegmentIndex: 0,
      leafNamesByIndex: ['GreatRhea', 'LesserRhea', 'Ostrich'],
      pairChanges: { byPairId: new Map() },
    });
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(React.createElement(TransitionInspectorPanel));
    });

    expect(container.textContent).toContain('GreatRhea, LesserRhea, Ostrich');

    await act(async () => {
      root.unmount();
    });
  });
});
