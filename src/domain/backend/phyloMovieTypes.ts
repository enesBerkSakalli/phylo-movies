export interface TreeNode {
  name: string;
  length: number;
  split_indices: number[];
  children: TreeNode[];
}

export interface TreeMetadata {
  tree_pair_key: string | null;
  /** One-based local frame ordinal within a tree-pair interpolation, not a semantic phase id. */
  step_in_pair: number | null;
  source_tree_global_index: number | null;
  frame_type: 'input_tree' | 'interpolation_frame';
  state_semantics: 'processed_input_tree' | 'algorithmic_intermediate';
  is_observed_input: boolean;
}

export interface SprPathSegment {
  split: number[];
  branch_length: number;
}

export interface SprMoveEvent {
  pivot_edge: number[];
  /** Planner-selected subtree that physically moves for this SPR event. */
  driver_subtree: number[];
  /** Active mover highlight groups for this event; excludes passive context clades. */
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

export interface AttachmentEdges {
  source: number[];
  destination: number[];
}

export interface TreePairSolution {
  affected_subtrees_by_split: Record<string, number[][][]>;
  attachment_edges_by_split: Record<string, Record<string, AttachmentEdges>>;
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
  window_size: number;
  step_size: number;
}

export type SubtreeHighlightTracking = Array<number[][] | null>;

export interface PhyloMovieData {
  interpolated_trees: TreeNode[];
  tree_metadata: TreeMetadata[];
  distances: {
    robinson_foulds: number[];
    weighted_robinson_foulds: number[];
    semantics?: {
      robinson_foulds?: {
        topology?: string;
        normalization?: string;
        scope?: string;
      };
      weighted_robinson_foulds?: {
        topology?: string;
        includes_branch_lengths?: boolean;
        includes_terminal_and_root_splits?: boolean;
        scope?: string;
      };
    };
  };
  tree_pair_solutions: Record<string, TreePairSolution>;
  pair_interpolation_ranges: Array<[number, number]>;
  pivot_edge_tracking: Array<number[] | null>;
  /** Per-frame active mover highlight groups. */
  subtree_highlight_tracking: SubtreeHighlightTracking;
  msa: MsaData;
  file_name: string;
  split_change_timeline: SplitChangeTimelineEntry[];
}
