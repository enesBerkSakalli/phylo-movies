/**
 * CommonAncestorBuilder - Utilities for finding Lowest Common Ancestors (LCA)
 * from normalized render entries.
 * Used for hierarchical edge bundling to group connections by shared ancestry.
 */

/**
 * Finds the Lowest Common Ancestor for normalized render entries using parent ids.
 * @param {Array<Object>} entries - Normalized entries with id/parentId
 * @param {Map<string, Object>} entryById - Lookup of normalized entries by id
 * @returns {Object|null} LCA entry, or null if no common ancestor found.
 */
export function findLowestCommonAncestorById(entries, entryById) {
  if (entries.length === 1) return entries[0];

  let commonAncestors = getLineageById(entries[0], entryById);
  for (let i = 1; i < entries.length; i++) {
    const currentIds = new Set(
      getLineageById(entries[i], entryById).map(getEntryId).filter(Boolean)
    );
    commonAncestors = commonAncestors.filter((ancestor) => currentIds.has(getEntryId(ancestor)));
    if (commonAncestors.length === 0) return null;
  }

  return commonAncestors[commonAncestors.length - 1] || null;
}

function getLineageById(entry, entryById) {
  const lineage = [];
  const seen = new Set();
  let current = entry;

  while (current) {
    const id = getEntryId(current);
    if (id && seen.has(id)) break;
    if (id) seen.add(id);
    lineage.unshift(current);

    const parentId = getParentId(current);
    current = parentId ? entryById.get(parentId) : null;
  }

  return lineage;
}

function getEntryId(entry) {
  return entry.id ?? null;
}

function getParentId(entry) {
  return entry.parentId ?? null;
}
