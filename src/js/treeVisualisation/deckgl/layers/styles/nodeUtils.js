export function toColorManagerNode(node) {
  // If the node has an originalNode reference (from NodeConverter), use that
  if (node?.originalNode) {
    return node.originalNode;
  }

  // Fallback for direct D3 hierarchy nodes
  return node;
}
