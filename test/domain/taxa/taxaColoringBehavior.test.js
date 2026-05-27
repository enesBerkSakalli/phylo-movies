// @vitest-environment jsdom

import React from 'react';
import { createRoot } from 'react-dom/client';
import { act, Simulate } from 'react-dom/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ColorSwatchInput } from '../../../src/components/taxa-coloring/shared/ColorSwatchInput.jsx';
import { loadCSVColumn } from '../../../src/components/taxa-coloring/utils/csvHelpers.js';
import { useAppStore } from '../../../src/state/phyloStore/store.js';
import { TooltipProvider } from '../../../src/components/ui/tooltip.tsx';

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
