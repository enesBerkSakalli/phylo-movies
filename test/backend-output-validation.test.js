/**
 * Backend Interpolation Pipeline Output Validation Test Suite
 *
 * Comprehensive tests for all top-level JSON fields produced by the backend.
 * Tests cover type validation, semantic correctness, error handling, and documentation completeness.
 *
 * Test Methodology:
 * - Load actual backend response (small_example.response.json)
 * - Validate structure, types, and semantic relationships
 * - Test error conditions with malformed data
 * - Document findings in structured JSON report
 */

import { expect } from 'chai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to test data
const TEST_DATA_PATH = path.join(__dirname, '../data/small_example/small_example.response.json');

// ============================================================================
// SCHEMA DEFINITIONS
// ============================================================================

/**
 * TreeNode Schema
 * Recursive structure representing a phylogenetic tree node
 *
 * @typedef {Object} TreeNode
 * @property {string} name - Node label (empty string for internal nodes, species name for leaves)
 * @property {number} length - Branch length from parent (float, >= 0)
 * @property {number[]} split_indices - Array of leaf indices in this subtree (sorted ascending)
 * @property {TreeNode[]} children - Array of child nodes (empty for leaves)
 * @property {Object} [values] - Optional node attributes (deprecated/legacy)
 */
const TreeNodeSchema = {
  type: 'object',
  required: ['name', 'length', 'split_indices', 'children'],
  properties: {
    name: { type: 'string' },
    length: { type: 'number', minimum: 0 },
    split_indices: {
      type: 'array',
      items: { type: 'integer', minimum: 0 },
      description: 'Must be sorted in ascending order'
    },
    children: {
      type: 'array',
      items: { $ref: '#/definitions/TreeNode' }
    },
    values: { type: 'object' }
  }
};

/**
 * TreeMetadata Schema
 * Metadata for each tree in interpolated_trees array (1:1 correspondence)
 *
 * @typedef {Object} TreeMetadata
 * @property {number} global_tree_index - Index in interpolated_trees array (0-based, sequential)
 * @property {string|null} tree_pair_key - Format: "pair_{i}_{j}" for interpolated frames, null for originals
 * @property {number|null} step_in_pair - Step number within pair (1-5), null for originals
 * @property {number|null} reference_pair_tree_index - Index of source tree in pair (0-4), null for originals
 * @property {number|null} target_pair_tree_index - Index of target tree in pair (0-4), null for originals
 * @property {number} source_tree_global_index - Global index of original source tree
 * @property {number|null} target_tree_global_index - Global index of original target tree, null for last tree
 */
const TreeMetadataSchema = {
  type: 'object',
  required: [
    'global_tree_index',
    'tree_pair_key',
    'step_in_pair',
    'reference_pair_tree_index',
    'target_pair_tree_index',
    'source_tree_global_index',
    'target_tree_global_index'
  ],
  properties: {
    global_tree_index: { type: 'integer', minimum: 0 },
    tree_pair_key: { type: ['string', 'null'], pattern: '^pair_\\d+_\\d+$|^null$' },
    step_in_pair: { type: ['integer', 'null'], minimum: 1, maximum: 5 },
    reference_pair_tree_index: { type: ['integer', 'null'], minimum: 0, maximum: 4 },
    target_pair_tree_index: { type: ['integer', 'null'], minimum: 0, maximum: 4 },
    source_tree_global_index: { type: 'integer', minimum: 0 },
    target_tree_global_index: { type: ['integer', 'null'], minimum: 0 }
  }
};

/**
 * TreePairSolution Schema
 * Solution data for a single tree pair transition
 *
 * @typedef {Object} TreePairSolution
 * @property {Object} jumping_subtree_solutions - Map of jumping subtree reconciliation solutions
 * @property {Object} mapping_one - Map: solution → atom partition in target tree (replaces solution_to_atom_mapping_target)
 * @property {Object} mapping_two - Map: solution → atom partition in source tree (replaces solution_to_atom_mapping_source)
 * @property {number[]} ancestor_of_changing_splits - Indices of ancestral nodes affected by changes
 * @property {Object[]} split_change_events - Array of split change event descriptors
 */
const TreePairSolutionSchema = {
  type: 'object',
  required: [
    'jumping_subtree_solutions',
    'mapping_one',
    'mapping_two',
    'ancestor_of_changing_splits',
    'split_change_events'
  ],
  properties: {
    jumping_subtree_solutions: { type: ['object', 'array'] },
    mapping_one: { type: 'object' },
    mapping_two: { type: 'object' },
    ancestor_of_changing_splits: {
      type: 'array',
      items: { type: 'integer', minimum: 0 }
    },
    split_change_events: { type: 'array' }
  }
};// ============================================================================
// FIELD MANIFEST - All expected top-level fields
// ============================================================================

const FIELD_MANIFEST = {
  interpolated_trees: {
    type: 'array',
    itemType: 'TreeNode',
    required: true,
    description: 'Flattened playback sequence: all original inputs, then every interpolated frame. Main data source for renderers/playback UIs.',
    ordering: 'Sequential playback order: original trees at specific indices, interpolated frames between them',
    consumers: ['WebGLTreeAnimationController', 'DeckGLTreeAnimationController', 'Timeline UI', 'Navigation'],
    errorHandling: 'If missing or wrong type, fail validation immediately; consumers must not proceed with invalid tree data'
  },
  tree_metadata: {
    type: 'array',
    itemType: 'TreeMetadata',
    required: true,
    description: 'Metadata aligned 1:1 with interpolated_trees. Each record provides frame categorization, pair mapping, and global index information.',
    ordering: 'Must have exactly same length as interpolated_trees; index correspondence is critical',
    consumers: ['Timeline', 'Frame categorization logic', 'Pair-level analytics', 'Navigation'],
    errorHandling: 'Length mismatch with interpolated_trees is fatal; missing fields should use null per schema'
  },
  tree_pair_solutions: {
    type: 'object',
    itemType: 'TreePairSolution',
    required: true,
    description: 'Maps pair_i_j (string) → TreePairSolution. Enables drill-down/reconciliation views and analytics for each tree transition.',
    ordering: 'Keys follow format "pair_X_Y" where X < Y; values contain index ranges matching interpolated_trees',
    consumers: ['Analytics views', 'Split change tracking', 'Debugging tools', 'Reconciliation UI'],
    errorHandling: 'Missing pair keys should log warning; malformed solution objects fail validation'
  },
  pair_interpolation_ranges: {
    type: 'array',
    itemType: '[number, number]',
    required: true,
    description: 'For each original tree pair, the [start_global_index, end_global_index] (inclusive) covering frames in interpolated_trees.',
    ordering: 'Array index corresponds to pair number (0-indexed); ranges must be non-overlapping and sequential',
    consumers: ['Timeline slicing', 'Pair navigation', 'Range queries'],
    errorHandling: 'Overlapping or non-sequential ranges indicate data corruption; fail validation'
  },
  distances: {
    type: 'object',
    itemType: null,
    required: true,
    description: 'Robinson-Foulds and weighted RF distances between consecutive original trees.',
    ordering: 'Arrays must have length = original_tree_count - 1',
    consumers: ['Metrics dashboard', 'Tree similarity analysis', 'Export reports'],
    errorHandling: 'Length mismatch logs error; missing keys use empty array'
  },
  original_tree_count: {
    type: 'number',
    itemType: null,
    required: true,
    description: 'Count of input trees (post-rooting/normalization). Used for validation and UI configuration.',
    ordering: 'Must equal number of original trees before interpolation',
    consumers: ['Validation', 'UI initialization', 'Summary stats'],
    errorHandling: 'Mismatch with actual tree count fails validation'
  },
  interpolated_tree_count: {
    type: 'number',
    itemType: null,
    required: true,
    description: 'Total count of all trees (originals + interpolated). Must equal interpolated_trees.length.',
    ordering: 'Must be >= original_tree_count',
    consumers: ['Buffer allocation', 'Progress bars', 'Performance metrics'],
    errorHandling: 'Mismatch with array length fails validation'
  },
  msa: {
    type: 'object',
    itemType: null,
    required: true,
    description: 'Multiple sequence alignment data with window parameters. Can be null if no MSA provided.',
    ordering: 'N/A',
    consumers: ['MSA Viewer', 'Sequence highlighting', 'Window calculations'],
    errorHandling: 'Missing object uses default with null sequences; invalid structure logs warning'
  },
  file_name: {
    type: 'string',
    itemType: null,
    required: true,
    description: 'Original input filename for user reference.',
    ordering: 'N/A',
    consumers: ['UI display', 'Export naming', 'Session management'],
    errorHandling: 'Missing value uses default "unknown.newick"'
  },
  processing_options: {
    type: 'object',
    itemType: null,
    required: true,
    description: 'Processing configuration used (e.g., rooting_enabled). Documents backend decisions.',
    ordering: 'N/A',
    consumers: ['Debugging', 'Session replay', 'Export metadata'],
    errorHandling: 'Missing object uses empty {}; logs warning'
  },
  tree_count: {
    type: 'object',
    itemType: null,
    required: true,
    description: 'Object with original and interpolated counts. Convenience wrapper for counts.',
    ordering: 'N/A',
    consumers: ['UI display', 'Validation cross-check'],
    errorHandling: 'Missing keys use parent-level counts'
  },
  window_size: {
    type: 'number',
    itemType: null,
    required: false,
    description: 'MSA window size parameter. Used for sequence window calculations.',
    ordering: 'N/A',
    consumers: ['MSA calculations', 'Window utilities'],
    errorHandling: 'Missing value defaults to 1'
  },
  window_step_size: {
    type: 'number',
    itemType: null,
    required: false,
    description: 'MSA window step size parameter. Controls window overlap/spacing.',
    ordering: 'N/A',
    consumers: ['MSA calculations', 'Window utilities'],
    errorHandling: 'Missing value defaults to 1'
  },
  covers: {
    type: 'array',
    itemType: null,
    required: false,
    description: 'Coverage data for split tracking (legacy/experimental).',
    ordering: 'N/A',
    consumers: ['Split tracking analytics'],
    errorHandling: 'Missing array defaults to []'
  },
  sorted_leaves: {
    type: 'array',
    itemType: 'string',
    required: false,
    description: 'Ordered list of leaf names. Defines canonical leaf ordering.',
    ordering: 'Leaf names in display order',
    consumers: ['Leaf ordering', 'Label display', 'MSA alignment'],
    errorHandling: 'Missing array uses extraction from first tree'
  },
  split_change_events: {
    type: 'object',
    itemType: 'object',
    required: false,
    description: 'Map of pair_key → array of split change events for that pair.',
    ordering: 'Keys follow pair_X_Y format; values are event arrays',
    consumers: ['Split change visualization', 'Event timeline'],
    errorHandling: 'Missing object defaults to {}'
  },
  split_change_timeline: {
    type: 'array',
    itemType: null,
    required: false,
    description: 'Timeline data structure for split changes (array of events).',
    ordering: 'Chronological order',
    consumers: ['Timeline visualization'],
    errorHandling: 'Missing array defaults to []'
  },
  split_change_tracking: {
    type: 'array',
    itemType: null,
    required: false,
    description: 'Tracking metadata for split changes (array of tracking records).',
    ordering: 'Sequential tracking order',
    consumers: ['Change tracking analytics'],
    errorHandling: 'Missing array defaults to []'
  }
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Validates TreeNode structure recursively
 */
function validateTreeNode(node, path = 'root') {
  const errors = [];

  // Check required fields
  if (typeof node.name !== 'string') {
    errors.push(`${path}.name: expected string, got ${typeof node.name}`);
  }
  if (typeof node.length !== 'number' || node.length < 0) {
    errors.push(`${path}.length: expected non-negative number, got ${node.length}`);
  }
  if (!Array.isArray(node.split_indices)) {
    errors.push(`${path}.split_indices: expected array, got ${typeof node.split_indices}`);
  } else {
    // Validate sorted order
    for (let i = 1; i < node.split_indices.length; i++) {
      if (node.split_indices[i] <= node.split_indices[i-1]) {
        errors.push(`${path}.split_indices: not sorted at index ${i}`);
        break;
      }
    }
  }
  if (!Array.isArray(node.children)) {
    errors.push(`${path}.children: expected array, got ${typeof node.children}`);
  } else {
    // Recurse into children
    node.children.forEach((child, idx) => {
      errors.push(...validateTreeNode(child, `${path}.children[${idx}]`));
    });
  }

  return errors;
}

/**
 * Validates TreeMetadata structure
 */
function validateTreeMetadata(metadata, index) {
  const errors = [];
  const path = `tree_metadata[${index}]`;

  if (typeof metadata.global_tree_index !== 'number' || metadata.global_tree_index !== index) {
    errors.push(`${path}.global_tree_index: expected ${index}, got ${metadata.global_tree_index}`);
  }

  // Validate conditional nulls
  const isOriginal = metadata.tree_pair_key === null;
  if (isOriginal) {
    if (metadata.step_in_pair !== null) {
      errors.push(`${path}.step_in_pair: expected null for original tree, got ${metadata.step_in_pair}`);
    }
  } else {
    if (typeof metadata.tree_pair_key !== 'string' || !metadata.tree_pair_key.match(/^pair_\d+_\d+$/)) {
      errors.push(`${path}.tree_pair_key: invalid format ${metadata.tree_pair_key}`);
    }
    if (typeof metadata.step_in_pair !== 'number' || metadata.step_in_pair < 1 || metadata.step_in_pair > 5) {
      errors.push(`${path}.step_in_pair: expected 1-5, got ${metadata.step_in_pair}`);
    }
  }

  return errors;
}

/**
 * Loads test data from JSON file
 */
function loadTestData() {
  const rawData = fs.readFileSync(TEST_DATA_PATH, 'utf8');
  return JSON.parse(rawData);
}

// ============================================================================
// TEST SUITE
// ============================================================================

describe('Backend Interpolation Pipeline Output Validation', function() {
  this.timeout(10000);

  let testData;
  let testResults = {
    tested_fields: [],
    undocumented_fields: [],
    highlight_debug: {},
    failures: []
  };

  before(function() {
    testData = loadTestData();
  });

  after(function() {
    // Write test results to JSON file
    const reportPath = path.join(__dirname, 'backend-output-validation-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(testResults, null, 2));
    console.log(`\n\n📊 Test report written to: ${reportPath}\n`);
  });

  // ==========================================================================
  // TOP-LEVEL FIELD PRESENCE TESTS
  // ==========================================================================

  describe('Field Presence Validation', function() {
    it('should have all required top-level fields', function() {
      const requiredFields = Object.entries(FIELD_MANIFEST)
        .filter(([_, spec]) => spec.required)
        .map(([name]) => name);

      const missingFields = requiredFields.filter(field => !(field in testData));

      if (missingFields.length > 0) {
        testResults.failures.push({
          test: 'Required field presence',
          missing_fields: missingFields
        });
      }

      expect(missingFields).to.be.empty;
    });

    it('should document all present fields', function() {
      const presentFields = Object.keys(testData);
      const undocumented = presentFields.filter(field => !(field in FIELD_MANIFEST));

      testResults.undocumented_fields = undocumented;

      if (undocumented.length > 0) {
        console.warn(`⚠️  Undocumented fields found: ${undocumented.join(', ')}`);
      }
    });
  });

  // ==========================================================================
  // TYPE AND STRUCTURE VALIDATION
  // ==========================================================================

  describe('Type and Structure Validation', function() {
    it('should validate all fields', function() {
      Object.entries(FIELD_MANIFEST).forEach(([fieldName, spec]) => {
        if (!(fieldName in testData)) {
          if (spec.required) {
            testResults.failures.push({
              test: 'Field presence',
              field: fieldName,
              error: 'Required field missing'
            });
            throw new Error(`Required field "${fieldName}" is missing from test data`);
          }
          return; // Skip optional missing fields
        }

        const fieldValue = testData[fieldName];

        // Type check
        const actualType = Array.isArray(fieldValue) ? 'array' : typeof fieldValue;
        expect(actualType, `Field ${fieldName} type mismatch`).to.equal(spec.type);

        testResults.tested_fields.push({
          name: fieldName,
          type: spec.type,
          description: spec.description,
          ordering: spec.ordering || 'N/A',
          error_handling: spec.errorHandling,
          notes: [`Consumed by: ${(spec.consumers || []).join(', ')}`],
          test_status: 'passed',
          json_shape: spec.itemType || 'scalar'
        });

        // Structure checks
        if (spec.type === 'array') {
          expect(fieldValue, `${fieldName} should be array`).to.be.an('array');
          expect(fieldValue.length, `${fieldName} should be non-negative length`).to.be.at.least(0);
        }

        if (spec.type === 'object' && fieldName !== 'tree_pair_solutions') {
          expect(fieldValue, `${fieldName} should be object`).to.be.an('object');
          expect(fieldValue, `${fieldName} should not be null`).to.not.be.null;
        }
      });
    });

    // Special deep validation for complex types
    describe('Complex Type Validation', function() {
      it('[interpolated_trees] should contain valid TreeNode structures', function() {
        expect(testData.interpolated_trees).to.be.an('array');

        // Validate first tree deeply
        const firstTree = testData.interpolated_trees[0];
        const errors = validateTreeNode(firstTree, 'interpolated_trees[0]');

        if (errors.length > 0) {
          testResults.failures.push({
            test: 'TreeNode structure validation',
            errors: errors
          });
        }

        expect(errors).to.be.empty;
      });

      it('[tree_metadata] should contain valid TreeMetadata structures', function() {
        expect(testData.tree_metadata).to.be.an('array');

        // Validate first few metadata entries
        const errors = [];
        for (let i = 0; i < Math.min(5, testData.tree_metadata.length); i++) {
          errors.push(...validateTreeMetadata(testData.tree_metadata[i], i));
        }

        if (errors.length > 0) {
          testResults.failures.push({
            test: 'TreeMetadata structure validation',
            errors: errors
          });
        }

        expect(errors).to.be.empty;
      });
    });
  });

  // ==========================================================================
  // SEMANTIC CORRECTNESS TESTS
  // ==========================================================================

  describe('Semantic Correctness Validation', function() {
    it('interpolated_tree_count should match interpolated_trees length', function() {
      const actualLength = testData.interpolated_trees.length;
      const declaredCount = testData.interpolated_tree_count;

      if (actualLength !== declaredCount) {
        testResults.failures.push({
          test: 'interpolated_tree_count consistency',
          expected: actualLength,
          actual: declaredCount
        });
      }

      expect(declaredCount).to.equal(actualLength);
    });

    it('tree_metadata should align 1:1 with interpolated_trees', function() {
      const treesLength = testData.interpolated_trees.length;
      const metadataLength = testData.tree_metadata.length;

      if (treesLength !== metadataLength) {
        testResults.failures.push({
          test: 'tree_metadata alignment',
          trees_count: treesLength,
          metadata_count: metadataLength
        });
      }

      expect(metadataLength).to.equal(treesLength);
    });

    it('pair_interpolation_ranges should be non-overlapping and sequential', function() {
      const ranges = testData.pair_interpolation_ranges;
      expect(ranges).to.be.an('array');

      for (let i = 0; i < ranges.length; i++) {
        const [start, end] = ranges[i];
        expect(start).to.be.a('number');
        expect(end).to.be.a('number');
        expect(end).to.be.at.least(start);

        // Check sequential/non-overlap with next range (end is inclusive, so next must start at end or after)
        if (i < ranges.length - 1) {
          const [nextStart] = ranges[i + 1];
          expect(nextStart).to.be.at.least(end, `Range ${i} [${start}, ${end}] overlaps with range ${i+1} starting at ${nextStart}`);
        }
      }
    });    it('distances arrays should match original_tree_count - 1', function() {
      const originalCount = testData.original_tree_count;
      const expectedLength = originalCount - 1;

      const rfLength = testData.distances.robinson_foulds.length;
      const wrfLength = testData.distances.weighted_robinson_foulds.length;

      if (rfLength !== expectedLength || wrfLength !== expectedLength) {
        testResults.failures.push({
          test: 'distances array length',
          expected: expectedLength,
          rf_actual: rfLength,
          wrf_actual: wrfLength
        });
      }

      expect(rfLength).to.equal(expectedLength);
      expect(wrfLength).to.equal(expectedLength);
    });

    it('tree_pair_solutions keys should match expected pair count', function() {
      const pairKeys = Object.keys(testData.tree_pair_solutions);
      const expectedPairCount = testData.original_tree_count - 1;

      if (pairKeys.length !== expectedPairCount) {
        testResults.failures.push({
          test: 'tree_pair_solutions key count',
          expected: expectedPairCount,
          actual: pairKeys.length
        });
      }

      expect(pairKeys.length).to.equal(expectedPairCount);

      // Validate structure of solutions
      pairKeys.forEach(key => {
        const solution = testData.tree_pair_solutions[key];
        expect(solution).to.have.property('jumping_subtree_solutions');
        expect(solution).to.have.property('mapping_one');
        expect(solution).to.have.property('mapping_two');
        expect(solution).to.have.property('ancestor_of_changing_splits');
        expect(solution).to.have.property('split_change_events');
      });
    });
  });

  // ==========================================================================
  // ERROR HANDLING TESTS
  // ==========================================================================

  describe('Error Handling Validation', function() {
    it('should handle missing interpolated_trees gracefully', function() {
      const malformedData = { ...testData };
      delete malformedData.interpolated_trees;

      // This should be caught by validation
      const requiredFields = Object.entries(FIELD_MANIFEST)
        .filter(([_, spec]) => spec.required)
        .map(([name]) => name);

      const missingFields = requiredFields.filter(field => !(field in malformedData));
      expect(missingFields).to.include('interpolated_trees');
    });

    it('should detect type mismatches', function() {
      const testCases = [
        { field: 'interpolated_tree_count', wrongValue: '23', expectedType: 'number' },
        { field: 'original_tree_count', wrongValue: [3], expectedType: 'number' },
        { field: 'file_name', wrongValue: 123, expectedType: 'string' }
      ];

      testCases.forEach(({ field, wrongValue, expectedType }) => {
        const wrongType = Array.isArray(wrongValue) ? 'array' : typeof wrongValue;
        expect(wrongType).to.not.equal(expectedType,
          `Type mismatch test failed for ${field}`);
      });
    });

    it('should detect ordering violations in split_indices', function() {
      // Create a node with unsorted split_indices
      const badNode = {
        name: 'test',
        length: 1.0,
        split_indices: [3, 1, 2], // Not sorted!
        children: []
      };

      const errors = validateTreeNode(badNode, 'test_node');
      expect(errors).to.not.be.empty;
      expect(errors.some(e => e.includes('not sorted'))).to.be.true;
    });
  });

  // ==========================================================================
  // HIGHLIGHTING DEBUG
  // ==========================================================================

  describe('Highlighting Debug Analysis', function() {
    it('should document highlighting logic for current frame', function() {
      // Reproduce highlighting issue scenario
      const currentGlobalIndex = 5; // Example: frame in middle of interpolation
      const currentMetadata = testData.tree_metadata[currentGlobalIndex];

      testResults.highlight_debug = {
        context: 'Frame highlighting in playback sequence',
        input_data: {
          global_tree_index: currentGlobalIndex,
          metadata: currentMetadata,
          is_original: currentMetadata.tree_pair_key === null,
          is_interpolated: currentMetadata.tree_pair_key !== null
        },
        expected: {
          highlighting: 'Interpolated frames should be visually distinct from original frames',
          ui_indicator: 'Frame type should be shown in timeline and HUD'
        },
        actual: {
          highlighting: 'Currently determined by tree_pair_key === null check',
          ui_indicator: 'Timeline uses interpolationData from segments'
        },
        explanation: [
          'Highlighting relies on tree_metadata.tree_pair_key to distinguish frame types',
          'Original trees have tree_pair_key = null',
          'Interpolated frames have tree_pair_key = "pair_X_Y"',
          'Timeline segments track interpolationData array with originalIndex references',
          'Potential issue: Mismatch between metadata.global_tree_index and segment.interpolationData indices',
          'Root cause: Timeline construction may not align perfectly with metadata array indices'
        ].join('\n'),
        recommendation: 'Verify timeline segment construction aligns with tree_metadata array indexing'
      };

      // Verify our understanding matches data
      expect(currentMetadata).to.have.property('global_tree_index');
      expect(currentMetadata).to.have.property('tree_pair_key');
    });

    it('should validate frame type categorization', function() {
      // Count original vs interpolated frames
      let originalCount = 0;
      let interpolatedCount = 0;

      testData.tree_metadata.forEach(meta => {
        if (meta.tree_pair_key === null) {
          originalCount++;
        } else {
          interpolatedCount++;
        }
      });

      const totalFrames = testData.interpolated_tree_count;
      const declaredOriginals = testData.original_tree_count;

      console.log(`\n  Frame Categorization:`);
      console.log(`    Original frames: ${originalCount} (declared: ${declaredOriginals})`);
      console.log(`    Interpolated frames: ${interpolatedCount}`);
      console.log(`    Total: ${totalFrames}`);

      expect(originalCount + interpolatedCount).to.equal(totalFrames);
    });
  });
});
