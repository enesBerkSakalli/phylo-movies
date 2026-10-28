import { describe, expect, it } from 'vitest';
import { filterNodesByVisibility } from '../../../../src/treeVisualisation/deckgl/layers/factory/LayerSetFactory.js';
import { LayerStyles } from '../../../../src/treeVisualisation/deckgl/layers/LayerStyles.js';
import { createDeckViews } from '../../../../src/treeVisualisation/deckgl/context/cameraState.js';
import { SYSTEM_TREE_COLORS } from '../../../../src/constants/TreeColors.js';
import { colorToRgb } from '../../../../src/services/ui/colorUtils.js';

const nodes = [
  { id: 'a', isLeaf: true },
  { id: 'b', isLeaf: false },
];

describe('node circles', () => {
  it('filters node circles by the visibility setting', () => {
    expect(filterNodesByVisibility(nodes, 'all')).toHaveLength(2);
    expect(filterNodesByVisibility(nodes, 'leaves').map((node) => node.id)).toEqual(['a']);
    expect(filterNodesByVisibility(nodes, 'none')).toHaveLength(0);
    expect(filterNodesByVisibility(nodes, undefined)).toHaveLength(2);
  });

  it("colours a node by its own branch's decision in saturation mode", () => {
    const styles = new LayerStyles();
    const key = 'metadata.saturation_dominant_decision';
    const node = { splitKey: 'x', annotations: { fields: { [key]: { value: 'saturated' } } } };
    const cached = { branchColorMode: 'saturation', saturationFormula: 'dominant' };
    expect(styles.getNodeColor(node, cached)).toEqual([
      ...colorToRgb(SYSTEM_TREE_COLORS.saturationSaturatedColor),
      255,
    ]);
    expect(styles.getNodeBorderColor(node, cached)).toEqual(styles.getNodeColor(node, cached));
  });

  it('keeps small z offsets inside the orthographic depth range when zoomed in', () => {
    const { orthographic } = createDeckViews(false);
    expect(orthographic.props.near).toBeLessThan(0);
    expect(orthographic.props.far).toBeGreaterThan(0);
  });
});
