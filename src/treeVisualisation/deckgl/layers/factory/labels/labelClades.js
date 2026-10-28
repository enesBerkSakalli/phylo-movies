/**
 * The clades of a still tree as ranges of label positions. Leaves come out in depth-first order,
 * so every clade covers a contiguous run of labels. Returns the roots as `{ lo, hi, children }`
 * (inclusive label indices); without a usable hierarchy every label is its own clade.
 */
export function buildLabelClades(nodes = [], labels = []) {
  const labelOfLeaf = new Map();
  labels.forEach((label, index) => {
    const leaf = label.split_indices?.[0];
    if (leaf !== undefined) labelOfLeaf.set(leaf, index);
  });
  const byId = new Map();
  const childrenOf = new Map();
  for (const node of nodes) {
    if (node.id === undefined) continue;
    byId.set(node.id, node);
    if (node.parentId !== undefined && node.parentId !== null) {
      if (!childrenOf.has(node.parentId)) childrenOf.set(node.parentId, []);
      childrenOf.get(node.parentId).push(node);
    }
  }
  const singles = () => labels.map((_, i) => ({ lo: i, hi: i, children: [] }));
  const roots = nodes.filter((node) => node.id !== undefined && !byId.has(node.parentId));
  if (roots.length === 0) return singles();

  // Pre-order walk, then children before parents so each clade spans its children's labels.
  const order = [];
  for (const stack = [...roots]; stack.length > 0;) {
    const node = stack.pop();
    order.push(node);
    stack.push(...(childrenOf.get(node.id) ?? []));
  }
  const cladeOf = new Map();
  for (let i = order.length - 1; i >= 0; i -= 1) {
    const node = order[i];
    const children = (childrenOf.get(node.id) ?? [])
      .map((child) => cladeOf.get(child.id))
      .filter(Boolean)
      .sort((a, b) => a.lo - b.lo);
    const own = node.isLeaf ? labelOfLeaf.get(node.split_indices?.[0]) : undefined;
    const ends = [...children.flatMap((c) => [c.lo, c.hi]), ...(own === undefined ? [] : [own])];
    if (ends.length > 0) {
      cladeOf.set(node.id, { lo: Math.min(...ends), hi: Math.max(...ends), children });
    }
  }
  const clades = roots.map((node) => cladeOf.get(node.id)).filter(Boolean);
  return clades.length > 0 ? clades : singles();
}
