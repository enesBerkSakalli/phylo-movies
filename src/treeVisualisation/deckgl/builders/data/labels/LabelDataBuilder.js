import { getSplitKey } from '../../../../../domain/tree/splits.js';
import { fitTaxonNames } from '../../../../../domain/tree/shortTaxonNames.js';
import {
  labelRotation,
  labelTextAnchor,
  normalizeDirection3,
  normalizePosition3,
  positionFromPolar,
  shouldFlipLabel,
} from '../../../../utils/polarGeometry.js';
import { LAYOUT_PROJECTION_MODES } from '../../../../layout/hyperbolicProjection/index.js';

// Name width budget in em of the drawn size, so it scales with the label size: ~265 px at the
// 11 px radial size, ~335 px at 12 px rows. It is wide enough for `Domain_…_Genus_species_strain`
// (19 to 27 em); longer names are cut with a middle ellipsis.
export const RADIAL_NAME_BUDGET_EM = 24;
export const ROW_NAME_BUDGET_EM = 28;

// Screen gap between a label and the end of its guide line (or its tip).
export const LABEL_GAP_PX = 6;
// The orthographic view is y-down like the screen, so a world angle points the same way.
const pixelOffsetAlong = (angle) => [
  LABEL_GAP_PX * Math.cos(angle),
  LABEL_GAP_PX * Math.sin(angle),
];

/**
 * LabelDataBuilder - Generates label data for tree leaves
 * Manages label positioning, rotation, and text anchors for radial layout.
 */
export class LabelDataBuilder {
  /**
   * Convert layout leaves to Deck.gl label data
   * @param {Array} leaves - Normalized layout leaves
   * @param {number} extensionRadius - Radius where labels should be placed
   * @param {number} [branchOffset=0] - Distance past the leaf for unrooted labels
   * @returns {Array} Array of label objects
   */
  convertLabels(leaves, extensionRadius, branchOffset = 0) {
    if (!extensionRadius) return [];

    // Long names are cut to a width budget; `name` keeps the full name for the tooltip.
    const budgetEm =
      leaves[0]?.projectionMode === LAYOUT_PROJECTION_MODES.RECTANGULAR
        ? ROW_NAME_BUDGET_EM
        : RADIAL_NAME_BUDGET_EM;
    const shortNames = fitTaxonNames(
      leaves.map((leaf) => leaf.name),
      budgetEm
    );
    return leaves
      .map((leaf) => {
        const label = this._createLabelData(leaf, extensionRadius, branchOffset);
        if (label) label.text = shortNames.get(label.name) ?? label.text;
        return label;
      })
      .filter(Boolean);
  }

  /**
   * Create single label data object
   * @private
   */
  _createLabelData(leaf, labelRadius, branchOffset = 0) {
    if (leaf.projectionMode === LAYOUT_PROJECTION_MODES.WALRUS_3D) {
      return this._createWalrus3dLabelData(leaf, labelRadius);
    }
    if (
      leaf.projectionMode === LAYOUT_PROJECTION_MODES.UNROOTED ||
      leaf.projectionMode === LAYOUT_PROJECTION_MODES.RECTANGULAR
    ) {
      return this._createUnrootedLabelData(leaf, branchOffset);
    }

    const angleRad = leaf.angle;
    if (
      !Number.isFinite(leaf.x) ||
      !Number.isFinite(leaf.y) ||
      !Number.isFinite(angleRad) ||
      !Number.isFinite(labelRadius)
    ) {
      console.warn(
        '[LabelDataBuilder] Skipping label with invalid layout coordinates:',
        leaf.split_indices
      );
      return null;
    }

    const distance = Math.sqrt(leaf.x * leaf.x + leaf.y * leaf.y);

    const needsFlip = shouldFlipLabel(angleRad);
    const textAnchor = labelTextAnchor(needsFlip);
    const rotation = labelRotation(angleRad, needsFlip);
    const position = positionFromPolar(labelRadius, angleRad);
    const splitIndices = leaf.split_indices;
    const splitKey = leaf.splitKey || getSplitKey({ split_indices: splitIndices });
    const labelKey = splitKey ? `label-${splitKey}` : null;
    if (!labelKey) {
      console.warn('[LabelDataBuilder] Skipping label without split_indices:', leaf.name);
      return null;
    }

    return {
      id: labelKey,
      position,
      text: leaf.name,
      name: leaf.name,
      isLeaf: true,
      split_indices: splitIndices,
      splitKey,
      angle: angleRad,
      distance,
      polarPosition: labelRadius,
      pixelOffset: pixelOffsetAlong(angleRad),
      textAnchor,
      rotation, // in RADIANS
    };
  }

  // Unrooted has no ring: the label continues the leaf's branch direction.
  _createUnrootedLabelData(leaf, branchOffset) {
    const angleRad = Number.isFinite(leaf.branchAngle) ? leaf.branchAngle : leaf.angle;
    if (!Number.isFinite(leaf.x) || !Number.isFinite(leaf.y) || !Number.isFinite(angleRad)) {
      console.warn(
        '[LabelDataBuilder] Skipping unrooted label with invalid layout coordinates:',
        leaf.split_indices
      );
      return null;
    }

    const splitIndices = leaf.split_indices;
    const splitKey = leaf.splitKey || getSplitKey({ split_indices: splitIndices });
    if (!splitKey) {
      console.warn('[LabelDataBuilder] Skipping label without split_indices:', leaf.name);
      return null;
    }

    const needsFlip = shouldFlipLabel(angleRad);
    const position = [
      leaf.x + Math.cos(angleRad) * branchOffset,
      leaf.y + Math.sin(angleRad) * branchOffset,
      0,
    ];

    return {
      id: `label-${splitKey}`,
      position,
      text: leaf.name,
      name: leaf.name,
      isLeaf: true,
      split_indices: splitIndices,
      splitKey,
      angle: angleRad,
      distance: Math.hypot(leaf.x, leaf.y),
      polarPosition: Math.hypot(position[0], position[1]),
      projectionMode: leaf.projectionMode,
      pixelOffset: pixelOffsetAlong(angleRad),
      textAnchor: labelTextAnchor(needsFlip),
      rotation: labelRotation(angleRad, needsFlip),
    };
  }

  _createWalrus3dLabelData(leaf, labelRadius) {
    const leafPosition = normalizePosition3(leaf.position);
    if (!leafPosition || !Number.isFinite(labelRadius)) {
      console.warn(
        '[LabelDataBuilder] Skipping 3D label with invalid layout coordinates:',
        leaf.split_indices
      );
      return null;
    }

    const distance = Math.hypot(leafPosition[0], leafPosition[1], leafPosition[2]);
    const direction = normalizeDirection3(leaf.h3Direction, leafPosition);
    const offset = Math.max(0, labelRadius - distance);
    const position = [
      leafPosition[0] + direction[0] * offset,
      leafPosition[1] + direction[1] * offset,
      leafPosition[2] + direction[2] * offset,
    ];
    const splitIndices = leaf.split_indices;
    const splitKey = leaf.splitKey || getSplitKey({ split_indices: splitIndices });
    const labelKey = splitKey ? `label-${splitKey}` : null;
    if (!labelKey) {
      console.warn('[LabelDataBuilder] Skipping 3D label without split_indices:', leaf.name);
      return null;
    }

    return {
      id: labelKey,
      position,
      text: leaf.name,
      name: leaf.name,
      isLeaf: true,
      split_indices: splitIndices,
      splitKey,
      angle: Number.isFinite(leaf.angle) ? leaf.angle : Math.atan2(position[1], position[0]),
      distance,
      polarPosition: Math.hypot(position[0], position[1], position[2]),
      projectionMode: leaf.projectionMode,
      h3Direction: direction,
      textAnchor: 'middle',
      rotation: 0,
    };
  }
}
