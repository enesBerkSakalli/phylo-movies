# Node Styles Module

> Style resolution for Deck.gl node layers in phylogenetic tree visualization.

## File Location
`src/treeVisualisation/deckgl/layers/styles/nodes/nodeStyles.js`

---

## Functions

### `getNodeColor(node, cached, helpers)`

Resolves node fill color with highlighting and dimming support.

**Priority Chain:**
1. **Completed Change Edge** -> Blue (100% opacity)
2. **Upcoming Change Edge** -> Blue (60% opacity)
3. **Active Pivot Edge** -> Blue with dimming
4. **Active Mover / Subtree Highlight** -> Accent/contrast/taxa based on mode
5. **Default** -> Base taxa/monophyletic color

**Returns:** `[r, g, b, opacity]` RGBA array for Deck.gl

---

### `getNodeBorderColor(node, cached, helpers)`

Resolves node border/stroke color.

**Priority Chain:**
1. **History Mode** -> Darkened blue (70% brightness)
2. **Active Pivot Edge** -> Pivot color
3. **Active Mover / Subtree Highlight** -> Highlight color
4. **History Subtree** -> Reduced-opacity stroke color
5. **Default** -> Stroke color

**Returns:** `[r, g, b, opacity]` RGBA array

---

### `getNodeRadius(node, minRadius, cached, helpers)`

*Re-exported from `nodeRadiusStyles.js`*

Resolves node radius with size multipliers for different states.

**Size Multipliers:**
| State            | Multiplier |
| ---------------- | ---------- |
| Entering/Exiting | 0.7×       |
| Completed Change | 1.5×       |
| Active Edge      | 1.5×       |
| Subtree Highlight | 1.6x       |
| History Subtree  | 1.15×      |
| Default          | 1.0×       |

---

### `getNodeBasedRgba(entity, baseOpacity, cached, helpers)`

Resolves color for entities that use node coloring (e.g., labels).

Used by label styles to inherit node-based colors.

Default visual role classification comes from
`src/treeVisualisation/deckgl/layers/styles/highlightResolver.js`. Node render
accessors should switch on `TREE_HIGHLIGHT_ROLE` rather than rechecking backend
movement fields directly.

---

## Dependencies

```
nodeStyles.js
├── colorUtils.js          # colorToRgb
├── TreeColors.js          # SYSTEM_TREE_COLORS
├── dimmingUtils.js        # applyDimmingWithCache
├── highlightResolver.js   # resolveTreeElementHighlight
├── nodeUtils.js           # Helper functions
│   ├── getHighlightColor
│   └── getPivotEdgeColor
└── nodeRadiusStyles.js    # getNodeRadius
```

---

## Cached State Properties Used

| Property                 | Description                     |
| ------------------------ | ------------------------------- |
| `colorManager`           | TreeColorManager instance       |
| `upcomingChangesEnabled` | History mode toggle             |
| `dimmingEnabled`         | Global dimming toggle           |
| `dimmingOpacity`         | Dimming opacity value           |
| `subtreeDimmingEnabled`  | Subtree-specific dimming        |
| `subtreeDimmingOpacity`  | Subtree dimming opacity         |
| `highlightedSubtreeData` | Array of highlighted subtree sets |
| `subtreeHighlightsEnabled` | Subtree highlighting toggle    |
| `highlightColorMode`     | 'solid' \| 'contrast' \| 'taxa' |
| `pulseOpacity`           | Current pulse animation value   |
| `densityScale`           | Tree density scaling factor     |
