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
  pairLabel: 'source input tree 1 to target input tree 2',
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
});
