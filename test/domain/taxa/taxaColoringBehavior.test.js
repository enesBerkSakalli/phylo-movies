// @vitest-environment jsdom

import React from 'react';
import { createRoot } from 'react-dom/client';
import { act, Simulate } from 'react-dom/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ColorSwatchInput } from '../../../src/components/taxa-coloring/shared/ColorSwatchInput.jsx';
import { TaxaColoringWindow } from '../../../src/components/taxa-coloring/TaxaColoringWindow.jsx';
import { TaxaColoringRndWindow } from '../../../src/components/taxa-coloring/TaxaColoringRndWindow.jsx';
import {
  chooseInitialCSVColumn,
  loadCSVColumn,
} from '../../../src/components/taxa-coloring/utils/csvHelpers.js';
import { useAppStore } from '../../../src/state/phyloStore/store.js';
import { TooltipProvider } from '../../../src/components/ui/tooltip.tsx';
import { parseGroupCSV } from '../../../src/treeColoring/utils/CSVParser.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

describe('taxa coloring store behavior', () => {
  const initialStoreState = useAppStore.getState();

  afterEach(() => {
    useAppStore.setState({ ...initialStoreState }, true);
    vi.restoreAllMocks();
  });

  it('renders tree controllers once when a color manager is present', () => {
    const controller = { renderAllElements: vi.fn() };
    const colorManager = {
      refreshColorCategories: vi.fn(() => {
        useAppStore.getState().treeControllers.forEach((treeController) => {
          treeController.renderAllElements();
        });
      }),
    };

    useAppStore.setState({
      treeControllers: [controller],
      colorManager,
      taxaGrouping: null,
      taxaColorVersion: 0,
      playing: false,
    });

    useAppStore.getState().setTaxaGrouping({
      mode: 'taxa',
      taxaColorMap: { TaxonA: '#123456' },
    });

    expect(controller.renderAllElements).toHaveBeenCalledTimes(1);
  });
});

describe('taxa coloring CSV restore behavior', () => {
  it('loads serialized CSV grouping maps as restored column data', () => {
    const csvData = {
      allGroupings: {
        clade: {
          TaxonA: 'Alpha',
          TaxonB: 'Beta',
        },
      },
      columnGroups: {
        clade: [
          { name: 'Alpha', count: 1, members: ['TaxonA'] },
          { name: 'Beta', count: 1, members: ['TaxonB'] },
        ],
      },
    };

    const { map, groups, validation } = loadCSVColumn(csvData, 'clade', ['TaxonA', 'TaxonB']);

    expect(validation.isValid).toBe(true);
    expect(map).toEqual(
      new Map([
        ['TaxonA', 'Alpha'],
        ['TaxonB', 'Beta'],
      ])
    );
    expect(groups).toHaveLength(2);
  });

  it('loads Augur-style TSV metadata keyed by accession prefixes', () => {
    const parsed = parseGroupCSV(
      [
        'accession\taccession_version\tcountry\tVP1_type\tRdRp_type',
        'PV588655\tPV588655.1\tUSA\tGII.17\tGII.P17',
        'PV746275\tPV746275.1\tRussia\tGII.4\tGII.P16',
      ].join('\n')
    );

    expect(parsed.success).toBe(true);

    const taxaNames = ['PV588655_P17_GII-17', 'PV746275_P16_GII-4'];
    const { map, groups, validation } = loadCSVColumn(parsed.data, 'VP1_type', taxaNames);

    expect(validation.isValid).toBe(true);
    expect(validation.matched).toEqual(taxaNames);
    expect(map).toEqual(
      new Map([
        ['PV588655_P17_GII-17', 'GII.17'],
        ['PV746275_P16_GII-4', 'GII.4'],
      ])
    );
    expect(groups).toEqual([
      { name: 'GII.17', count: 1, members: ['PV588655_P17_GII-17'] },
      { name: 'GII.4', count: 1, members: ['PV746275_P16_GII-4'] },
    ]);
  });

  it('uses a preferred metadata column when bundled metadata declares one', () => {
    const csvData = {
      groupingColumns: [{ name: 'accession' }, { name: 'VP1_type' }, { name: 'country' }],
    };

    expect(chooseInitialCSVColumn(csvData, 'VP1_type')).toBe('VP1_type');
    expect(chooseInitialCSVColumn(csvData, 'missing_column')).toBe('accession');
  });
});

describe('ColorSwatchInput', () => {
  let roots = [];

  afterEach(async () => {
    for (const root of roots) {
      await act(async () => {
        root.unmount();
      });
    }
    roots = [];
    document.body.innerHTML = '';
  });

  async function renderOpenSwatch(onChange = vi.fn()) {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    roots.push(root);

    await act(async () => {
      root.render(
        React.createElement(
          TooltipProvider,
          null,
          React.createElement(ColorSwatchInput, {
            label: 'TaxonA',
            color: '#000000',
            onChange,
          })
        )
      );
    });

    const trigger = document.querySelector('button[aria-label="Select color for TaxonA"]');
    await act(async () => {
      Simulate.click(trigger);
    });

    return { onChange };
  }

  it('does not commit incomplete custom hex colors while typing', async () => {
    const { onChange } = await renderOpenSwatch();
    const textInput = Array.from(document.querySelectorAll('input')).find(
      (input) => input.type === 'text'
    );

    await act(async () => {
      Simulate.change(textInput, { target: { value: '#' } });
    });

    expect(onChange).not.toHaveBeenCalled();

    await act(async () => {
      Simulate.change(textInput, { target: { value: '#123456' } });
    });

    expect(onChange).toHaveBeenCalledWith('#123456');
  });

  it('gives quick color swatches stable accessible labels', async () => {
    const { onChange } = await renderOpenSwatch();
    const swatch = document.querySelector('button[aria-label^="Apply #"]');

    expect(swatch).not.toBeNull();

    await act(async () => {
      Simulate.click(swatch);
    });

    expect(onChange).toHaveBeenCalledWith(expect.stringMatching(/^#[0-9A-Fa-f]{6}$/));
  });

  it('renders the color popover above floating taxa windows', async () => {
    await renderOpenSwatch();

    expect(document.querySelector('[data-slot="popover-content"]')?.className).toContain(
      'z-[1300]'
    );
  });
});

describe('TaxaColoringWindow palette application', () => {
  let roots = [];

  afterEach(async () => {
    for (const root of roots) {
      await act(async () => {
        root.unmount();
      });
    }
    roots = [];
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  async function renderTaxaWindow(onApply = vi.fn()) {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    roots.push(root);

    await act(async () => {
      root.render(
        React.createElement(
          TooltipProvider,
          null,
          React.createElement(TaxaColoringWindow, {
            taxaNames: ['TaxonA', 'TaxonB', 'TaxonC', 'TaxonD'],
            originalColorMap: {
              TaxonA: '#000000',
              TaxonB: '#000000',
              TaxonC: '#000000',
              TaxonD: '#000000',
            },
            initialState: {},
            onApply,
          })
        )
      );
    });

    return { onApply };
  }

  function latestTaxaColorMap(onApply) {
    return onApply.mock.calls.at(-1)?.[0]?.taxaColorMap;
  }

  async function clickButtonByText(text) {
    const buttons = Array.from(document.querySelectorAll('button'));
    const button = buttons.find((candidate) => candidate.textContent.includes(text));

    if (!button) {
      throw new Error(
        `Expected a button containing "${text}". Available buttons: ${buttons
          .map((candidate) => candidate.textContent.trim())
          .join(' | ')}`
      );
    }

    await act(async () => {
      if (Simulate.pointerDown) {
        Simulate.pointerDown(button, { button: 0, ctrlKey: false });
      }
      Simulate.mouseDown(button, { button: 0, ctrlKey: false });
      Simulate.click(button);
    });
  }

  it('emits a new taxa color map for consecutive palette assignments', async () => {
    const { onApply } = await renderTaxaWindow();
    const defaultMap = latestTaxaColorMap(onApply);

    await clickButtonByText('Browse Palettes');
    await clickButtonByText('Tableau10');
    const firstPaletteMap = latestTaxaColorMap(onApply);

    await clickButtonByText('Category10');
    const secondPaletteMap = latestTaxaColorMap(onApply);

    expect(firstPaletteMap).not.toEqual(defaultMap);
    expect(secondPaletteMap).not.toEqual(firstPaletteMap);
  });

  it('keeps restored pattern assignments active when CSV metadata is also cached', async () => {
    const onApply = vi.fn();
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    roots.push(root);

    await act(async () => {
      root.render(
        React.createElement(
          TooltipProvider,
          null,
          React.createElement(TaxaColoringWindow, {
            taxaNames: ['Species_A', 'Species_B'],
            originalColorMap: {
              Species_A: '#000000',
              Species_B: '#000000',
            },
            initialState: {
              mode: 'groups',
              separators: ['_'],
              strategyType: 'prefix',
              groupColorMap: {
                Species: '#123456',
              },
              csvGroups: [
                { name: 'Alpha', count: 1, members: ['Species_A'] },
                { name: 'Beta', count: 1, members: ['Species_B'] },
              ],
              csvTaxaMap: {
                Species_A: 'Alpha',
                Species_B: 'Beta',
              },
              csvColumn: 'clade',
              csvData: {
                allGroupings: {
                  clade: {
                    Species_A: 'Alpha',
                    Species_B: 'Beta',
                  },
                },
                groupingColumns: [{ name: 'clade', displayName: 'Clade' }],
              },
            },
            onApply,
          })
        )
      );
    });

    const latestResult = onApply.mock.calls.at(-1)?.[0];

    expect(latestResult.mode).toBe('groups');
    expect(latestResult.groupColorMap).toEqual({
      Species: '#123456',
    });
  });
});

describe('TaxaColoringRndWindow palette application', () => {
  const initialStoreState = useAppStore.getState();
  let roots = [];

  afterEach(async () => {
    for (const root of roots) {
      await act(async () => {
        root.unmount();
      });
    }
    roots = [];
    document.body.innerHTML = '';
    useAppStore.setState({ ...initialStoreState }, true);
    vi.restoreAllMocks();
  });

  async function renderRndWindow(taxaNames = ['TaxonA', 'TaxonB', 'TaxonC', 'TaxonD']) {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    roots.push(root);

    useAppStore.setState({
      taxaColoringOpen: true,
      taxaColoringWindow: { x: 40, y: 40, width: 640, height: 700 },
      leafNamesByIndex: taxaNames,
      treeControllers: [{ renderAllElements: vi.fn() }],
      taxaGrouping: null,
      taxaColorVersion: 0,
      playing: false,
    });

    await act(async () => {
      root.render(
        React.createElement(
          TooltipProvider,
          null,
          React.createElement(TaxaColoringRndWindow, { isActive: true })
        )
      );
    });
  }

  function storedTaxaColorMap() {
    return useAppStore.getState().taxaGrouping?.taxaColorMap;
  }

  async function clickButtonByText(text) {
    const buttons = Array.from(document.querySelectorAll('button'));
    const button = buttons.find((candidate) => candidate.textContent.includes(text));

    if (!button) {
      throw new Error(
        `Expected a button containing "${text}". Available buttons: ${buttons
          .map((candidate) => candidate.textContent.trim())
          .join(' | ')}`
      );
    }

    await act(async () => {
      Simulate.click(button);
    });
  }

  it('persists consecutive taxa palette assignments from the floating window', async () => {
    await renderRndWindow();
    const defaultMap = storedTaxaColorMap();

    await clickButtonByText('Browse Palettes');
    await clickButtonByText('Tableau10');
    const firstPaletteMap = storedTaxaColorMap();

    await clickButtonByText('Category10');
    const secondPaletteMap = storedTaxaColorMap();

    expect(firstPaletteMap).not.toEqual(defaultMap);
    expect(secondPaletteMap).not.toEqual(firstPaletteMap);
    expect(useAppStore.getState().taxaColorVersion).toBeGreaterThanOrEqual(3);
  });

  it('keeps palette choices distinct when the taxa count exceeds a scheme length', async () => {
    const taxaNames = Array.from({ length: 12 }, (_, index) => `Taxon${index + 1}`);
    await renderRndWindow(taxaNames);

    await clickButtonByText('Browse Palettes');
    await clickButtonByText('Tableau10');
    const firstPaletteMap = storedTaxaColorMap();

    await clickButtonByText('Category10');
    const secondPaletteMap = storedTaxaColorMap();

    expect(secondPaletteMap).not.toEqual(firstPaletteMap);
  });
});
