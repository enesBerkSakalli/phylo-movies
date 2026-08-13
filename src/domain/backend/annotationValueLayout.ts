/**
 * Two interchangeable layouts for a node's compact annotation values.
 *
 * Backend payloads emit one two-element array per field:
 *
 *   [[definitionIndex, value], [definitionIndex, value], ...]
 *
 * On the shipped datasets that is six short-lived arrays for every annotated
 * node - 176,262 of them in all_trees_24 alone - and it measures at 53% of the
 * resident payload heap. The flat layout holds the same pairs in one array:
 *
 *   [definitionIndex, value, definitionIndex, value, ...]
 *
 * trading six array headers for one. Every reader below accepts either layout,
 * so runs stored before this change keep loading without a schema version bump.
 *
 * The two are told apart by their first entry: a definition index is always an
 * integer, so a leading array can only mean the nested layout. An empty list
 * reads as flat, which means the same thing either way - no pairs.
 */

type AnnotationPairVisitor = (definitionIndex: unknown, value: unknown, ordinal: number) => void;

export function isNestedAnnotationValues(values: unknown): boolean {
  return Array.isArray(values) && values.length > 0 && Array.isArray(values[0]);
}

/**
 * Calls visit(definitionIndex, value, ordinal) for each pair in either layout.
 * Malformed entries are skipped rather than thrown on, because the validator
 * reports them against the field path it owns.
 */
export function forEachAnnotationPair(values: unknown, visit: AnnotationPairVisitor): void {
  if (!Array.isArray(values)) return;

  if (isNestedAnnotationValues(values)) {
    for (let index = 0; index < values.length; index += 1) {
      const pair: unknown = values[index];
      if (Array.isArray(pair) && pair.length === 2) visit(pair[0], pair[1], index);
    }
    return;
  }

  for (let offset = 0; offset + 1 < values.length; offset += 2) {
    visit(values[offset], values[offset + 1], offset / 2);
  }
}

/** Returns the flat layout for either input layout. Idempotent. */
function toFlatAnnotationValues(values: unknown): unknown {
  if (!Array.isArray(values) || !isNestedAnnotationValues(values)) return values;

  const flat: unknown[] = new Array<unknown>(values.length * 2);
  for (let index = 0; index < values.length; index += 1) {
    const pair = values[index] as [unknown, unknown];
    flat[index * 2] = pair[0];
    flat[index * 2 + 1] = pair[1];
  }
  return flat;
}

function flattenNodeAnnotationValues(node: unknown): void {
  if (!node) return;

  if (Array.isArray(node)) {
    node[3] = toFlatAnnotationValues(node[3]);
    const children: unknown = node[4];
    if (Array.isArray(children)) {
      for (const child of children) flattenNodeAnnotationValues(child);
    }
    return;
  }

  if (typeof node !== 'object') return;
  const record = node as Record<string, unknown>;
  if (record.annotation_values !== undefined) {
    record.annotation_values = toFlatAnnotationValues(record.annotation_values);
  }
  if (Array.isArray(record.children)) {
    for (const child of record.children) flattenNodeAnnotationValues(child);
  }
}

/**
 * Rewrites every node's annotation values to the flat layout, in place, and
 * returns the same array. In place because this runs on the transport payload
 * at the ingest boundary, where copying the node graph would cost exactly the
 * memory the flat layout exists to save. Idempotent, so re-validating an
 * already-flattened stored run is a no-op.
 */
export function flattenTreeAnnotationValues<T>(trees: T): T {
  if (!Array.isArray(trees)) return trees;
  for (const tree of trees) flattenNodeAnnotationValues(tree);
  return trees;
}
