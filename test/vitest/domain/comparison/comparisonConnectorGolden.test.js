// Golden pin for the comparison-view connectors (the lines linking matching taxa between the two
// trees). Each case drives ComparisonModeRenderer.renderStatic - the entry the app uses - with the
// real store, layout and layer-data code, and snapshots what it hands to the layers.
// Records are order independent (sorted by content, ids left out) so a refactor may reorder or
// rename connectors but not move, recolour or resize one: every refactor of the connector builders
// must leave test/fixtures/comparison-golden/*.json byte-identical.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { phyloData } from '../../../../src/services/data/dataService.js';
import { useAppStore } from '../../../../src/state/phyloStore/store.js';
import { TreeLayoutController } from '../../../../src/treeVisualisation/TreeLayoutController.js';
import { DeckGLTreeLayerDataFactory } from '../../../../src/treeVisualisation/deckgl/DeckGLTreeLayerDataFactory.js';
import { ComparisonModeRenderer } from '../../../../src/treeVisualisation/comparison/ComparisonModeRenderer.js';
import { rightComparisonIndex } from '../../../../src/domain/indexing/treeIndexSemantics.js';
import { selectInputFrameIndices } from '../../../../src/state/phyloStore/selectors/treeSelectors.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const PALETTE = ['#e41a1c', '#377eb8', '#4daf4a', '#984ea3', '#ff7f00', '#a65628'];
const round2 = (x) => Math.round(x * 100) / 100 + 0;

// cases: [label, leftFrame, rightFrame | 'next', store overrides]
// `colour` gives every taxon a colour; `drivers` replaces the frame's moving-subtree highlight.
const FIXTURES = {
  small_example: {
    file: 'test/data/small_example/small_example.response.json',
    cases: [
      ['identical-trees', 5, 5],
      ['first-step', 1, 'next'],
      ['second-move', 14, 'next'],
      ['five-leaf-subtree', 21, 'next'],
      ['later-pair', 66, 'next'],
      ['coloured-taxa', 14, 'next', { colour: true }],
      ['taxa-highlight', 14, 'next', { colour: true, highlightColorMode: 'taxa' }],
      [
        'highlights-off',
        21,
        'next',
        { subtreeHighlightsEnabled: false, linkConnectionOpacity: 0.3 },
      ],
      ['half-circle', 21, 'next', { layoutAngleDegrees: 180, layoutRotationDegrees: 40 }],
    ],
  },
  ostrich: {
    file: 'test/data/ostrich_bug_response.json',
    cases: [
      ['identical-trees', 7, 7],
      ['first-move', 1, 'next'],
      ['second-move', 7, 'next'],
      ['third-move', 12, 'next'],
      ['two-drivers', 7, 'next', { drivers: [[10], [8, 9]] }],
      ['coloured-taxa', 7, 'next', { colour: true }],
      ['contrast-highlight', 7, 'next', { colour: true, highlightColorMode: 'contrast' }],
      [
        'highlights-off',
        7,
        'next',
        { subtreeHighlightsEnabled: false, linkConnectionOpacity: 0.3 },
      ],
      ['half-circle', 7, 'next', { layoutAngleDegrees: 180, layoutRotationDegrees: 40 }],
    ],
  },
};

function connectorRecords(connectors) {
  return connectors
    .map((c) => [
      c.isCurrentlyMoving ? 'active' : 'passive',
      c.sourceInfo.name,
      c.targetInfo.name,
      Array.from(c.path, round2),
      Array.from(c.color),
      c.width,
    ])
    .sort((a, b) => JSON.stringify(a.slice(0, 3)).localeCompare(JSON.stringify(b.slice(0, 3))));
}

// Valid JSON, one connector per line, so a changed value shows up as a small diff.
const toJson = (cases) =>
  `{\n${Object.entries(cases)
    .map(([key, rows]) => `"${key}": [\n${rows.map((r) => JSON.stringify(r)).join(',\n')}\n]`)
    .join(',\n')}\n}\n`;

async function renderConnectors(movieData, [left, right, overrides = {}]) {
  const { colour, drivers, ...storeOverrides } = overrides;
  useAppStore.getState().initialize(phyloData.validate(structuredClone(movieData)));
  await new Promise((resolve) => {
    setTimeout(resolve, 0); // initialize() colours on a timer
  });
  const tracking = [...useAppStore.getState().subtreeHighlightTracking];
  if (drivers) tracking[left] = drivers;
  useAppStore.setState({
    viewsConnected: true,
    frameIndex: left,
    subtreeHighlightTracking: tracking,
    ...storeOverrides,
  });
  if (colour) {
    const names = useAppStore.getState().leafNamesByIndex;
    useAppStore.getState().setTaxaGrouping({
      mode: 'taxa',
      taxaColorMap: Object.fromEntries(names.map((n, i) => [n, PALETTE[i % PALETTE.length]])),
    });
  }
  useAppStore.getState().updateColorManagerForIndex(left);

  const layout = new TreeLayoutController(null);
  const updateLayers = vi.fn();
  const renderer = new ComparisonModeRenderer({
    calculateLayout: layout.calculateLayout.bind(layout),
    _getConsistentRadii: layout._getConsistentRadii.bind(layout),
    dataConverter: new DeckGLTreeLayerDataFactory(),
    deckContext: { getCanvasDimensions: () => ({ width: 1200, height: 800 }) },
    viewportManager: { getRightTreeOffset: () => ({ x: 0, y: 0 }), focusOnTree: vi.fn() },
    _updateLayersEfficiently: updateLayers,
  });
  const rightFrame =
    right === 'next'
      ? rightComparisonIndex(selectInputFrameIndices(useAppStore.getState()), left)
      : right;
  await renderer.renderStatic(left, rightFrame);
  return updateLayers.mock.calls[0][0].connectors;
}

describe('comparison connector golden', () => {
  const initialState = useAppStore.getState();
  const resetStore = () => {
    useAppStore.getState().reset();
    useAppStore.setState(initialState, true);
  };
  afterEach(() => {
    resetStore();
    vi.restoreAllMocks();
  });

  for (const [name, { file, cases }] of Object.entries(FIXTURES)) {
    it(`${name} keeps its connectors`, async () => {
      const movieData = JSON.parse(readFileSync(path.join(repoRoot, file), 'utf8'));
      const rows = {};
      for (const [label, left, right, overrides] of cases) {
        const connectors = await renderConnectors(movieData, [left, right, overrides]);
        rows[label] = connectorRecords(connectors);
        resetStore(); // overrides must not leak into the next case
      }
      await expect(toJson(rows)).toMatchFileSnapshot(
        `../../../fixtures/comparison-golden/${name}.json`
      );
    });
  }
});
