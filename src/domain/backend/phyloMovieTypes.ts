export interface TreeNode {
  name: string;
  length: number;
  split_indices: number[];
  children: TreeNode[];
}

export interface TreeMetadata {
  tree_pair_key: string | null;
  step_in_pair: number | null;
  source_tree_global_index: number | null;
}

export interface SplitChangeEvent {
  split: number[];
  step_range: [number, number];
}

export interface SprPathSegment {
  split: number[];
  branch_length: number;
}

export interface SprMoveEvent {
  pivot_edge: number[];
  /** Planner-selected subtree that physically moves for this SPR event. */
  driver_subtree: number[];
  /** Visual context for this event; may include related non-driver subtrees. */
  highlight_group: number[][];
  step_range: [number, number];
  collapse_path: SprPathSegment[];
  expand_path: SprPathSegment[];
  collapse_hops: number;
  expand_hops: number;
  total_hops: number;
  collapse_branch_length: number;
  expand_branch_length: number;
  total_branch_length: number;
}

export interface TreePairSolution {
  jumping_subtree_solutions: Record<string, number[][][]>;
  solution_to_source_map: Record<string, unknown>;
  solution_to_destination_map: Record<string, unknown>;
  split_change_events: SplitChangeEvent[];
  spr_move_events?: SprMoveEvent[];
}

export interface OriginalTimelineEntry {
  type: 'original';
  tree_index: number;
  global_index: number;
  name: string;
}

export interface SplitEventTimelineEntry {
  type: 'split_event';
  pair_key: string;
  split: number[];
  step_range_local: [number, number];
  step_range_global: [number, number];
}

export type SplitChangeTimelineEntry = OriginalTimelineEntry | SplitEventTimelineEntry;

export interface MsaData {
  sequences: Record<string, string> | null;
  window_size?: number;
  step_size?: number;
}

export interface PhyloMovieData {
  interpolated_trees: TreeNode[];
  tree_metadata: TreeMetadata[];
  distances: {
    robinson_foulds: number[];
    weighted_robinson_foulds: number[];
    [key: string]: unknown;
  };
  tree_pair_solutions: Record<string, TreePairSolution>;
  pair_interpolation_ranges: Array<[number, number]>;
  pivot_edge_tracking: Array<number[] | null>;
  /** Legacy backend field name: per-frame visual/highlight groups, not movement ownership. */
  subtree_tracking: Array<number[][] | null>;
  msa: MsaData;
  sorted_leaves: string[];
  file_name: string;
  split_change_events: Record<string, SplitChangeEvent[]>;
  split_change_timeline: SplitChangeTimelineEntry[];
  [key: string]: unknown;
}
