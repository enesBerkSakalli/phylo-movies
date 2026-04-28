# Tree Visualization Antipatterns

A comprehensive guide to common antipatterns in phylogenetic and hierarchical tree visualization, and how PhyloMovies addresses them.

---

## Rendering & Performance

| Antipattern                          | Problem                           | Better Approach                                          |
| ------------------------------------ | --------------------------------- | -------------------------------------------------------- |
| **Rendering all nodes always**       | Wastes GPU on off-screen elements | Frustum culling / viewport-based rendering               |
| **Recreating layer data each frame** | High GC pressure, stuttering      | Cache layer data, use `updateTriggers`                   |
| **Manual tree traversal**            | Duplicates D3's built-in methods  | Use `root.descendants()`, `root.leaves()`, `root.each()` |
| **String concatenation for keys**    | Slow comparisons, GC pressure     | Pre-computed numeric keys or `KeyGenerator`              |
| **Inline accessor functions**        | Functions recreated each render   | Define accessors at module level or cache in constructor |

---

## Layout & Geometry

| Antipattern                         | Problem                          | Better Approach                                |
| ----------------------------------- | -------------------------------- | ---------------------------------------------- |
| **Fixed node sizes**                | Doesn't scale with tree size     | Adaptive sizing based on node count            |
| **Label overlap**                   | Unreadable at dense regions      | Collision detection, smart hiding, or fish-eye |
| **Ignoring branch lengths**         | Loses evolutionary distance info | Cladogram vs phylogram toggle                  |
| **Crossing branches ("hairballs")** | Visual chaos during transitions  | Leaf ordering optimization                     |
| **Uniform spacing**                 | Wastes space, hides structure    | Tidy tree or radial layouts                    |

---

## Animation & Interpolation

| Antipattern                                       | Problem                            | Better Approach                                 |
| ------------------------------------------------- | ---------------------------------- | ----------------------------------------------- |
| **Linear position interpolation**                 | Nodes "cut through" other branches | Arc-based or hierarchical path interpolation    |
| **Interpolating between incompatible topologies** | Meaningless intermediate states    | Anchor/mover decomposition (lattice solver)     |
| **No easing functions**                           | Mechanical, unnatural motion       | Ease-in-out for organic movement                |
| **Animating everything simultaneously**           | Cognitive overload                 | Staged animations (collapse → reorder → expand) |
| **No scrubbing support**                          | Users can't inspect transitions    | Bi-directional interpolation cache              |

---

## Interaction

| Antipattern               | Problem                          | Better Approach                   |
| ------------------------- | -------------------------------- | --------------------------------- |
| **Tiny hit targets**      | Frustrating on touch/dense trees | Invisible larger hit zones        |
| **No hover feedback**     | User can't tell what's clickable | Highlight on hover                |
| **Zoom without focus**    | Loses context                    | Zoom centered on cursor/selection |
| **No breadcrumb/minimap** | Lost in large trees              | Overview + detail pattern         |
| **Click-only selection**  | Limited for power users          | Support for multi-select, lasso   |

---

## Data Handling

| Antipattern                                | Problem                           | Better Approach                   |
| ------------------------------------------ | --------------------------------- | --------------------------------- |
| **Storing computed layout in source data** | Mixes concerns, breaks reactivity | Separate layout cache             |
| **Repeated `find()` for node lookup**      | O(n) per lookup                   | Build index Map once, O(1) lookup |
| **Parsing Newick on every render**         | Expensive                         | Parse once, cache `d3.hierarchy`  |
| **No memoization of derived data**         | Recalculates on every frame       | Memoize with stable keys          |

---

## deck.gl Specific

| Antipattern                              | Problem                                   | Better Approach                               |
| ---------------------------------------- | ----------------------------------------- | --------------------------------------------- |
| **Missing `updateTriggers`**             | Layers don't re-render when colors change | Always specify triggers for dynamic accessors |
| **Inline arrow functions for callbacks** | Functions recreated each render           | Bind handlers in constructor                  |
| **No layer cloning**                     | Full layer reconstruction                 | Use `.clone()` for efficient updates          |
| **Console.log in event handlers**        | Performance hit in production             | Remove or wrap in DEBUG flag                  |
| **Synchronous heavy computation**        | Blocks main thread                        | Use Web Workers for layout                    |

---

## How PhyloMovies Addresses These

### ✅ Already Implemented

| Feature                        | Implementation                                              |
| ------------------------------ | ----------------------------------------------------------- |
| **Leaf ordering optimization** | `TreeOrderOptimizer` places anchors center, movers at edges |
| **Staged animations**          | 5-step surgery (zero → collapse → reorder → graft → expand) |
| **Layout caching**             | `InterpolationCache` with Web Worker background computation |
| **Stable keys**                | `KeyGenerator` uses `split_indices` for deck.gl layer keys  |
| **Viewport rendering**         | `LayerManager` creates layers for visible elements          |
| **D3 traversal methods**       | Most builders use `.descendants()`, `.leaves()`             |
| **updateTriggers**             | Layer factories include proper triggers                     |
| **Bi-directional scrubbing**   | `InterpolationRenderer` supports forward/backward           |

### ⚠️ Partial / In Progress

| Feature                       | Status                                                  |
| ----------------------------- | ------------------------------------------------------- |
| **Adaptive node sizing**      | Implemented via `AdaptiveScaling` but could be enhanced |
| **Label collision detection** | Basic hiding, no intelligent placement                  |
| **Minimap/overview**          | Not implemented                                         |

---

## Related Documentation

- [tree-traversal-anti-patterns.md](tree-traversal-anti-patterns.md) - Specific D3 traversal patterns
- [tree-traversal-refactoring-plan.md](tree-traversal-refactoring-plan.md) - Refactoring roadmap
- [ui-guidelines.md](ui-guidelines.md) - UI/UX conventions

---

## References

- [deck.gl Best Practices](https://deck.gl/docs/developer-guide/performance)
- [D3 Hierarchy API](https://github.com/d3/d3-hierarchy)
- [Phylogenetic Tree Visualization Survey](https://doi.org/10.1093/molbev/msy022)
