import { SETTINGS_PANEL_ID, TREE_PANEL_ID } from './panelRegistry.js';

/**
 * Ported from Quirk (src/components/adaptive-dock.js); the anchor is the tree.
 *
 * A narrow window borrows a single tab group. The wide grid remains a placement plan, not a
 * second set of panels: moving existing panels preserves their React roots and unsaved drafts.
 * fromJSON is deliberately not used here; it recreates renderers.
 */
export class AdaptiveDock {
  constructor(
    api,
    wideLayout,
    { anchorId = TREE_PANEL_ID, pinnedIds = [TREE_PANEL_ID, SETTINGS_PANEL_ID] } = {}
  ) {
    this.api = api;
    this.wide = wideLayout === undefined ? undefined : structuredClone(wideLayout);
    this.narrow = false;
    this.changing = false;
    this.anchorId = anchorId;
    this.pinnedIds = new Set(pinnedIds);
  }

  setNarrow(narrow) {
    if (narrow === this.narrow || this.changing) return;
    this.changing = true;
    try {
      if (narrow) {
        this.wide ??= this.api.toJSON();
        this.narrow = true;
        this.reconcile();
        this.gather();
      } else {
        this.reconcile();
        this.restore();
        this.narrow = false;
        this.wide = this.api.toJSON();
      }
    } finally {
      this.changing = false;
    }
  }

  /** Fold new tabs into the remembered inspector, and never resurrect a tab closed while narrow. */
  reconcile() {
    if (!this.narrow) return;
    const current = this.api.toJSON();
    const live = new Set(
      this.api.panels.filter((p) => p.group.api.location.type === 'grid').map((p) => p.id)
    );
    const remembered = new Set();
    const prune = (node) => {
      if (node.type === 'branch') {
        const data = node.data.map(prune).filter(Boolean);
        return data.length ? { ...node, data } : undefined;
      }
      const views = node.data.views.filter((id) => live.has(id));
      for (const id of views) remembered.add(id);
      return views.length
        ? {
            ...node,
            data: {
              ...node.data,
              views,
              activeView: views.includes(node.data.activeView) ? node.data.activeView : views[0],
            },
          }
        : undefined;
    };
    let root = prune(this.wide.grid.root);
    if (!root) return; // The permanent tree ordinarily guarantees at least one leaf.
    const extra = [...live].filter((id) => !remembered.has(id));
    const leaves = leafNodes(root);
    if (extra.length) {
      const inspector = leaves.find(
        (node) => !node.data.views.some((id) => this.pinnedIds.has(id))
      );
      if (inspector) inspector.data.views.push(...extra);
      else {
        const leaf = {
          type: 'leaf',
          size: 360,
          data: { id: 'adaptive-inspector', views: extra, activeView: extra[0] },
        };
        if (this.wide.grid.orientation === 'HORIZONTAL' && root.type === 'branch')
          root.data.push(leaf);
        else {
          // Keep the old subtree's orientation by putting it one level below a new horizontal root.
          this.wide.grid.orientation = 'HORIZONTAL';
          root = { type: 'branch', data: [root, leaf] };
        }
      }
    }
    this.wide.grid.root = root;
    this.wide.panels = Object.fromEntries([...live].map((id) => [id, current.panels[id]]));
  }

  gather() {
    const group = this.api.getPanel(this.anchorId)?.group;
    if (!group) return;
    const active = this.api.activePanel;
    for (const panel of [...this.api.panels]) {
      if (panel.group.api.location.type !== 'grid' || panel.group === group) continue;
      panel.api.moveTo({ group, skipSetActive: true });
    }
    if (active?.group === group) active.api.setActive();
    else this.api.getPanel(this.anchorId).api.setActive();
  }

  /** Recreate the split tree using public group operations, moving the same live panel objects. */
  restore() {
    const { api, wide } = this;
    const first = leafNodes(wide.grid.root)[0];
    const anchor = api.getPanel(first.data.views[0]);
    if (!anchor) return;
    this.gather();
    const groupByLeaf = new Map();
    const build = (node, group, horizontal) => {
      if (node.type === 'leaf') {
        node.data.views.forEach((id, index) => {
          const panel = api.getPanel(id);
          if (panel && (panel.group !== group || group.panels.indexOf(panel) !== index)) {
            panel.api.moveTo({ group, index, skipSetActive: true });
          }
        });
        groupByLeaf.set(node, group);
        return;
      }
      const groups = [group];
      for (let i = 1; i < node.data.length; i++) {
        const next = api.addGroup({
          referenceGroup: groups[i - 1],
          direction: horizontal ? 'right' : 'below',
        });
        const seed = leafNodes(node.data[i])[0].data.views[0];
        api.getPanel(seed).api.moveTo({ group: next, skipSetActive: true });
        groups.push(next);
      }
      node.data.forEach((child, index) => build(child, groups[index], !horizontal));
    };
    const rootHorizontal = wide.grid.orientation === 'HORIZONTAL';
    build(wide.grid.root, anchor.group, rootHorizontal);
    const size = (node, width, height, horizontal) => {
      if (node.type === 'leaf') {
        groupByLeaf.get(node).api.setSize({ width: Math.round(width), height: Math.round(height) });
        api.getPanel(node.data.activeView)?.api.setActive();
        return;
      }
      const total = node.data.reduce((sum, child) => sum + (child.size || 1), 0);
      for (const child of node.data) {
        const fraction = (child.size || 1) / total;
        size(
          child,
          horizontal ? width * fraction : width,
          horizontal ? height : height * fraction,
          !horizontal
        );
      }
    };
    size(wide.grid.root, api.width, api.height, rootHorizontal);
    const activeLeaf = leafNodes(wide.grid.root).find((node) => node.data.id === wide.activeGroup);
    api.getPanel(activeLeaf?.data.activeView ?? this.anchorId)?.api.setActive();
  }

  layout() {
    this.reconcile();
    if (!this.narrow) this.wide = this.api.toJSON();
    return this.wide;
  }
}

function leafNodes(node) {
  return node.type === 'leaf' ? [node] : node.data.flatMap(leafNodes);
}
