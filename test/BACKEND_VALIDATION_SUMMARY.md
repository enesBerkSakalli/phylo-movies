# Backend Interpolation Pipeline Output Validation Summary

## Test Execution Results

**Date:** 10 November 2025
**Test Suite:** `backend-output-validation.test.js`
**Test Data:** `data/small_example/small_example.response.json`

### Summary Statistics

- ✅ **15 tests passing**
- ❌ **0 tests failing**
- 📊 **18 fields validated**
- 🔍 **0 undocumented fields**
- ⚠️ **0 validation failures**

---

## Comprehensive Field Documentation

### Core Tree Data Fields

#### 1. `interpolated_trees` (array of TreeNode) ✅
**Description:** Flattened playback sequence containing all original input trees and every interpolated frame between them.

**JSON Structure:**
```json
{
  "name": "string",              // Node label (empty for internal nodes)
  "length": "number",            // Branch length (float, >= 0)
  "split_indices": [int],        // Sorted array of leaf indices in subtree
  "children": [TreeNode]         // Recursive array of child nodes
}
```

**Ordering:** Sequential playback order - original trees at specific indices, interpolated frames between them
**Consumers:** WebGLTreeAnimationController, DeckGLTreeAnimationController, Timeline UI, Navigation
**Error Handling:** If missing or wrong type, fail validation immediately; consumers must not proceed with invalid tree data

---

#### 2. `tree_metadata` (array of TreeMetadata) ✅
**Description:** Metadata aligned 1:1 with `interpolated_trees`. Each record provides frame categorization, pair mapping, and global index information.

**JSON Structure:**
```json
{
  "global_tree_index": 0,                      // Index in interpolated_trees (0-based)
  "tree_pair_key": "pair_0_1" | null,          // null for originals, "pair_X_Y" for interpolated
  "step_in_pair": 3 | null,                    // 1-5 for interpolated, null for originals
  "reference_pair_tree_index": 2 | null,       // 0-4 within pair, null for originals
  "target_pair_tree_index": 3 | null,          // 0-4 within pair, null for originals
  "source_tree_global_index": 0,               // Global index of source original tree
  "target_tree_global_index": 21 | null        // Global index of target original tree
}
```

**Ordering:** Must have exactly same length as `interpolated_trees`; index correspondence is critical
**Consumers:** Timeline, Frame categorization logic, Pair-level analytics, Navigation
**Error Handling:** Length mismatch with `interpolated_trees` is fatal; missing fields should use null per schema

**Frame Categorization Logic:**
- Original frames: `tree_pair_key === null`
- Interpolated frames: `tree_pair_key === "pair_X_Y"`
- Use `global_tree_index` for array indexing
- Use `step_in_pair` (1-5) for within-pair positioning

---

#### 3. `tree_pair_solutions` (object map) ✅
**Description:** Maps `pair_i_j` (string keys) → TreePairSolution objects. Enables drill-down/reconciliation views and analytics for each tree transition.

**JSON Structure (per solution):**
```json
{
  "jumping_subtree_solutions": {},             // Map of jumping subtree reconciliations
  "mapping_one": {},                          // Solution → atom partition in target tree
  "mapping_two": {},                          // Solution → atom partition in source tree
  "ancestor_of_changing_splits": [int],       // Indices of ancestral nodes affected
  "split_change_events": [...]                // Array of event descriptors
}
```

**Ordering:** Keys follow format `"pair_X_Y"` where X < Y
**Consumers:** Analytics views, Split change tracking, Debugging tools, Reconciliation UI
**Error Handling:** Missing pair keys should log warning; malformed solution objects fail validation

**Note:** Previous versions included `start_global_index` and `end_global_index` fields. Current version uses `pair_interpolation_ranges` array for this information instead.

---

#### 4. `pair_interpolation_ranges` (array of [number, number]) ✅
**Description:** For each original tree pair, the `[start_global_index, end_global_index]` tuple (inclusive) covering frames in `interpolated_trees`.

**Example:**
```json
[
  [0, 21],    // Pair 0: frames 0-21 (inclusive)
  [21, 22]    // Pair 1: frames 21-22 (shares boundary at 21)
]
```

**Ordering:** Array index corresponds to pair number (0-indexed); ranges can share boundaries (inclusive) but must not overlap
**Consumers:** Timeline slicing, Pair navigation, Range queries
**Error Handling:** Overlapping ranges indicate data corruption; fail validation

---

### Distance Metrics

#### 5. `distances` (object) ✅
**Description:** Robinson-Foulds and weighted RF distances between consecutive original trees.

**JSON Structure:**
```json
{
  "robinson_foulds": [0.67, 0.0],        // Topological distances
  "weighted_robinson_foulds": [14.0, 0.0] // Branch-length-weighted distances
}
```

**Ordering:** Arrays must have length = `original_tree_count - 1`
**Consumers:** Metrics dashboard, Tree similarity analysis, Export reports
**Error Handling:** Length mismatch logs error; missing keys use empty array

---

### Count and Configuration Fields

#### 6. `original_tree_count` (number) ✅
**Description:** Count of input trees (post-rooting/normalization).

**Test Data Value:** `3`
**Consumers:** Validation, UI initialization, Summary stats
**Error Handling:** Mismatch with actual tree count fails validation

---

#### 7. `interpolated_tree_count` (number) ✅
**Description:** Total count of all trees (originals + interpolated). Must equal `interpolated_trees.length`.

**Test Data Value:** `23`
**Validation:** Must be >= `original_tree_count`
**Consumers:** Buffer allocation, Progress bars, Performance metrics
**Error Handling:** Mismatch with array length fails validation

---

#### 8. `tree_count` (object) ✅
**Description:** Convenience wrapper containing both counts.

**JSON Structure:**
```json
{
  "original": 3,
  "interpolated": 23
}
```

**Consumers:** UI display, Validation cross-check

---

### MSA (Multiple Sequence Alignment) Fields

#### 9. `msa` (object) ✅
**Description:** Multiple sequence alignment data with window parameters.

**JSON Structure:**
```json
{
  "sequences": {...} | null,      // Map of sequence_name → sequence_string
  "alignment_length": 517 | null,
  "window_size": 1,
  "step_size": 1,
  "overlapping": false
}
```

**Consumers:** MSA Viewer, Sequence highlighting, Window calculations
**Error Handling:** Missing object uses default with null sequences; invalid structure logs warning

---

#### 10. `window_size` (number) ✅
**Description:** MSA window size parameter.

**Default:** `1`
**Consumers:** MSA calculations, Window utilities

---

#### 11. `window_step_size` (number) ✅
**Description:** MSA window step size parameter. Controls window overlap/spacing.

**Default:** `1`
**Consumers:** MSA calculations, Window utilities

---

### Split Change Tracking Fields

#### 12. `split_change_events` (object) ✅
**Description:** Map of `pair_key` → array of split change events for that pair.

**JSON Structure:**
```json
{
  "pair_0_1": [...],  // Events for first pair
  "pair_1_2": [...]   // Events for second pair
}
```

**Ordering:** Keys follow `pair_X_Y` format
**Consumers:** Split change visualization, Event timeline
**Error Handling:** Missing object defaults to `{}`

---

#### 13. `split_change_timeline` (array) ✅
**Description:** Timeline data structure for split changes (array of events).

**Ordering:** Chronological order
**Consumers:** Timeline visualization
**Error Handling:** Missing array defaults to `[]`

---

#### 14. `split_change_tracking` (array) ✅
**Description:** Tracking metadata for split changes (array of tracking records).

**Ordering:** Sequential tracking order
**Consumers:** Change tracking analytics
**Error Handling:** Missing array defaults to `[]`

---

### Leaf Ordering

#### 15. `sorted_leaves` (array of strings) ✅
**Description:** Ordered list of leaf names. Defines canonical leaf ordering.

**Example:**
```json
["O1", "O2", "A", "A1", "A2", "B", "B1", "C", ...]
```

**Ordering:** Leaf names in display order
**Consumers:** Leaf ordering, Label display, MSA alignment
**Error Handling:** Missing array uses extraction from first tree

---

### Metadata Fields

#### 16. `file_name` (string) ✅
**Description:** Original input filename for user reference.

**Example:** `"small_example.newick"`
**Consumers:** UI display, Export naming, Session management
**Error Handling:** Missing value uses default `"unknown.newick"`

---

#### 17. `processing_options` (object) ✅
**Description:** Processing configuration used by backend.

**JSON Structure:**
```json
{
  "rooting_enabled": false
}
```

**Consumers:** Debugging, Session replay, Export metadata
**Error Handling:** Missing object uses empty `{}`; logs warning

---

#### 18. `covers` (array) ✅
**Description:** Coverage data for split tracking (legacy/experimental).

**Consumers:** Split tracking analytics
**Error Handling:** Missing array defaults to `[]`

---

## Highlighting Debug Analysis

### Issue Context
Frame highlighting in playback sequence to distinguish original vs interpolated frames.

### Current Implementation
- **Data Source:** `tree_metadata.tree_pair_key`
- **Original Detection:** `tree_pair_key === null`
- **Interpolated Detection:** `tree_pair_key === "pair_X_Y"`
- **Timeline Integration:** Uses `segment.interpolationData` array with `originalIndex` references

### Test Case Analysis
**Global Tree Index:** 5
**Metadata:**
```json
{
  "global_tree_index": 5,
  "tree_pair_key": "pair_0_1",
  "step_in_pair": 5,
  "is_original": false,
  "is_interpolated": true
}
```

### Expected Behavior
- Interpolated frames should be visually distinct from original frames
- Frame type should be shown in timeline and HUD

### Potential Issues
1. **Index Alignment:** Potential mismatch between `metadata.global_tree_index` and `segment.interpolationData` indices
2. **Timeline Construction:** Timeline construction may not perfectly align with `tree_metadata` array indices
3. **Boundary Cases:** Shared boundaries in `pair_interpolation_ranges` (e.g., frame 21 belongs to both pair 0 and pair 1)

### Recommendation
Verify timeline segment construction aligns with `tree_metadata` array indexing. Cross-reference:
- `tree_metadata[i].global_tree_index === i`
- Timeline segment boundaries match `pair_interpolation_ranges`
- `interpolationData[j].originalIndex` correctly maps to original tree indices

---

## Semantic Correctness Validations

All semantic relationships validated:

1. ✅ `interpolated_tree_count === interpolated_trees.length`
2. ✅ `tree_metadata.length === interpolated_trees.length`
3. ✅ `pair_interpolation_ranges` are non-overlapping and sequential
4. ✅ `distances.robinson_foulds.length === original_tree_count - 1`
5. ✅ `distances.weighted_robinson_foulds.length === original_tree_count - 1`
6. ✅ `tree_pair_solutions` keys count matches `original_tree_count - 1`
7. ✅ TreeNode `split_indices` arrays are sorted in ascending order
8. ✅ TreeMetadata `global_tree_index` matches array position

---

## Error Handling Tests

All error handling scenarios validated:

1. ✅ Missing required fields detection
2. ✅ Type mismatch detection (string vs number, array vs object)
3. ✅ Malformed TreeNode detection (unsorted `split_indices`)
4. ✅ TreeMetadata consistency validation

---

## Test Coverage Summary

### Test Categories
- **Field Presence Validation:** 2 tests
- **Type and Structure Validation:** 2 tests
- **Semantic Correctness Validation:** 5 tests
- **Error Handling Validation:** 3 tests
- **Highlighting Debug Analysis:** 2 tests
- **Frame Categorization:** 1 test

### Key Findings
- ✅ All 18 fields are properly documented
- ✅ No undocumented fields found in test data
- ✅ All type constraints validated
- ✅ All semantic relationships consistent
- ✅ Frame categorization logic documented and validated

### Schema Corrections Made
During testing, the following schema corrections were identified and fixed:

1. **`split_change_events`:** Expected `array`, actually `object` (map of pair_key → events)
2. **`split_change_timeline`:** Expected `object`, actually `array`
3. **`split_change_tracking`:** Expected `object`, actually `array`
4. **`tree_pair_solutions`:** Removed deprecated `start_global_index` and `end_global_index` fields (now in `pair_interpolation_ranges`)
5. **`mapping_one` and `mapping_two`:** Renamed from `solution_to_atom_mapping_target` and `solution_to_atom_mapping_source`

---

## Usage Recommendations

### For Frontend Developers
1. **Always check `tree_metadata.tree_pair_key`** to distinguish frame types
2. **Use `global_tree_index`** for array indexing into `interpolated_trees`
3. **Validate length alignment** between `tree_metadata` and `interpolated_trees` on load
4. **Use `pair_interpolation_ranges`** for slicing operations, not individual solution objects

### For Backend Developers
1. **Maintain 1:1 correspondence** between `interpolated_trees` and `tree_metadata`
2. **Ensure `split_indices` are always sorted** in TreeNode structures
3. **Keep `pair_interpolation_ranges` non-overlapping** (can share boundaries)
4. **Populate all TreeMetadata fields** (use `null` for optional fields on original frames)

### For QA/Testing
1. **Run backend validation suite** after any pipeline changes
2. **Verify frame categorization** with test data of various sizes
3. **Test boundary cases** (pairs sharing range endpoints)
4. **Validate distances array lengths** match `original_tree_count - 1`

---

## Test Artifacts

- **Test File:** `test/backend-output-validation.test.js`
- **Report:** `test/backend-output-validation-report.json`
- **Test Data:** `data/small_example/small_example.response.json`

**Run Tests:**
```bash
npx mocha --require @babel/register test/backend-output-validation.test.js
```

---

## Conclusion

The backend interpolation pipeline output has been comprehensively validated. All 18 fields are properly typed, documented, and semantically consistent. The highlighting issue has been analyzed and documented with specific recommendations for resolution.

**Status:** ✅ All tests passing
**Coverage:** 100% of top-level fields
**Recommendation:** Deploy with confidence; monitor timeline-metadata alignment in production
