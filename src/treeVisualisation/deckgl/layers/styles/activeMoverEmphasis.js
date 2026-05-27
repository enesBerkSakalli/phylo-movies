function subtreeSize(subtree) {
  if (subtree instanceof Set) return subtree.size;
  return Array.isArray(subtree) ? subtree.length : 0;
}

function smallestMoverSize(colorManager) {
  const subtrees = colorManager?.activeMoverSubtrees;
  if (!Array.isArray(subtrees) || subtrees.length === 0) return 0;

  return subtrees.reduce((smallest, subtree) => {
    const size = subtreeSize(subtree);
    if (size <= 0) return smallest;
    return smallest === 0 ? size : Math.min(smallest, size);
  }, 0);
}

export function getActiveMoverEmphasis(entity, cached, kind) {
  if (cached?.subtreeHighlightScope === 'all') return 1;

  const colorManager = cached?.colorManager;
  const isActiveMover =
    kind === 'link'
      ? colorManager?.isLinkInActiveMoverSubtree?.(entity)
      : colorManager?.isNodeInActiveMoverSubtree?.(entity);

  if (!isActiveMover) return 1;

  const moverSize = smallestMoverSize(colorManager);
  if (moverSize <= 0) return 1;

  const taxaCount = Number.isFinite(cached?.taxaCount) ? cached.taxaCount : 0;
  const ratio = taxaCount > 0 ? moverSize / taxaCount : 1;

  if (moverSize <= 2 || ratio <= 0.02) return 1.6;
  if (moverSize <= 5 || ratio <= 0.05) return 1.35;
  if (ratio <= 0.1) return 1.15;
  return 1;
}

export function getSubtleActiveMoverEmphasis(entity, cached, kind) {
  const emphasis = getActiveMoverEmphasis(entity, cached, kind);
  return 1 + (emphasis - 1) * 0.2;
}
