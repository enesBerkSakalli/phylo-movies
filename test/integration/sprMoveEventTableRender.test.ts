// @vitest-environment jsdom
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SprMoveEventTable } from '../../src/components/TreeStatsPanel/SubtreeAnalytics/SprMoveEventTable';
import type { SprMoveEventRow } from '../../src/components/TreeStatsPanel/SubtreeAnalytics/types';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const leafNamesByIndex = ['A', 'B', 'C', 'D'];

const createSprMoveEvent = (overrides: Partial<SprMoveEventRow> = {}): SprMoveEventRow => ({
  eventId: 'pair_0_1:spr:0',
  pairLabel: 'Source tree 1 -> Target tree 2',
  pairId: 'pair_0_1',
  pairIndex: 0,
  sourceInputTreeIndex: 0,
  targetInputTreeIndex: 1,
  eventIndex: 0,
  signature: '1',
  splitIndices: [1],
  driverSplitIndices: [1],
  contextSplitIndices: [1],
  highlightGroup: [[1]],
  groupSize: 1,
  pivotEdge: [2],
  sourceAttachment: [0],
  destinationAttachment: [3],
  sourceAttachmentSupport: null,
  destinationAttachmentSupport: null,
  sourceMovedSubtreeBranchValue: null,
  destinationMovedSubtreeBranchValue: null,
  sourceParentBranchValue: null,
  destinationParentBranchValue: null,
  branchValueClass: 'value_missing',
  contextBranchValueClass: 'value_missing',
  stepRange: [0, 4],
  frameRange: [1, 5],
  totalPathHops: 2,
  totalPathLength: 0.5,
  rfDistance: null,
  weightedRfDistance: null,
  ...overrides,
});

async function renderTable(events: SprMoveEventRow[]) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(
      React.createElement(SprMoveEventTable, {
        events,
        leafNamesByIndex,
        branchValueThreshold: 70,
        onBranchValueThresholdChange: vi.fn(),
      })
    );
  });

  return { container, root };
}

afterEach(() => {
  document.body.innerHTML = '';
  vi.clearAllMocks();
});

describe('SPR move event table rendering', () => {
  it('renders missing RF metrics as missing values, not zero distances', async () => {
    const { container, root } = await renderTable([createSprMoveEvent()]);

    const metricCell = container.querySelectorAll('tbody td')[7];
    expect(metricCell?.textContent).toContain('RF -');
    expect(metricCell?.textContent).toContain('WRF -');
    expect(metricCell?.textContent).not.toContain('RF 0.000');
    expect(metricCell?.textContent).not.toContain('WRF 0.000');

    await act(async () => {
      root.unmount();
    });
  });

  it('labels mini topology leaves from leafNamesByIndex instead of snapshot node names', async () => {
    const topology = {
      root: {
        name: 'internal',
        length: null,
        splitIndices: [1, 2],
        children: [
          { name: 'wrong-b', length: null, splitIndices: [1], children: [] },
          { name: 'wrong-c', length: null, splitIndices: [2], children: [] },
        ],
      },
      newick: '(B,C);',
      topologySignature: '(1,2)',
      leafCount: 2,
      nodeCount: 3,
      splitIndices: [1, 2],
    };
    const { container, root } = await renderTable([
      createSprMoveEvent({
        splitIndices: [1, 2],
        sourceMovedSubtreeTopology: topology,
        destinationMovedSubtreeTopology: topology,
      }),
    ]);

    await act(async () => {
      container
        .querySelector<HTMLButtonElement>(
          'button[aria-label^="Compare source and target moved subtree topology"]'
        )
        ?.click();
    });

    expect(document.body.textContent).toContain('B');
    expect(document.body.textContent).toContain('C');
    expect(document.body.textContent).not.toContain('wrong-b');
    expect(document.body.textContent).not.toContain('wrong-c');

    await act(async () => {
      root.unmount();
    });
  });

  it('shows clear topology and jump controls for each SPR move', async () => {
    const { container, root } = await renderTable([createSprMoveEvent()]);

    expect(container.textContent).toContain('Topology');
    expect(container.textContent).toContain('Jump to move');
    expect(container.textContent).toContain('Source tree 1 -> Target tree 2');
    const jumpButton = Array.from(container.querySelectorAll<HTMLButtonElement>('button')).find(
      (button) => button.textContent?.includes('Jump to move')
    );
    expect(jumpButton?.getAttribute('aria-label')).toContain('Jump to #1');

    await act(async () => {
      root.unmount();
    });
  });
});
