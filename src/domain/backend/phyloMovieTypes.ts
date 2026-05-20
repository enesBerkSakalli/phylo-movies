export interface TreeNode {
  name: string;
  length: number;
  split_indices: number[];
  children: TreeNode[];
}

export interface TimelineFrame {
  frame_index: number;
  frame_type: 'input_tree' | 'interpolation_frame';
  state_semantics: 'processed_input_tree' | 'algorithmic_intermediate';
  is_observed_input: boolean;
  input_tree_index: number | null;
  pair_id: string | null;
  pair_ordinal: number | null;
  local_step_index: number | null;
  source_frame_index: number | null;
  target_frame_index: number | null;
}

export interface AttachmentEdges {
  source: number[];
  destination: number[];
}

export interface PairSolution {
  affected_subtrees_by_split: Record<string, number[][][]>;
  attachment_edges_by_split: Record<string, Record<string, AttachmentEdges>>;
}

export interface TimelinePair {
  pair_id: string;
  pair_ordinal: number;
  source_input_tree_index: number;
  target_input_tree_index: number;
  source_frame_index: number;
  target_frame_index: number;
  generated_frame_range: [number, number] | null;
  solution: PairSolution;
}

export interface SprPathSegment {
  split: number[];
  branch_length: number;
}

interface TemporalEventBase {
  event_id: string;
  event_type: 'split_change' | 'spr_move';
  pair_id: string;
  pair_ordinal: number;
  local_step_range: [number, number];
  frame_range: [number, number];
}

export interface SplitChangeTemporalEvent extends TemporalEventBase {
  event_type: 'split_change';
  split: number[];
}

export interface SprMoveTemporalEvent extends TemporalEventBase {
  event_type: 'spr_move';
  pivot_edge: number[];
  /** Planner-selected subtree that physically moves for this SPR event. */
  driver_subtree: number[];
  /** Active mover highlight groups for this event; excludes passive context clades. */
  highlight_group: number[][];
  collapse_path: SprPathSegment[];
  expand_path: SprPathSegment[];
  collapse_hops: number;
  expand_hops: number;
  total_hops: number;
  collapse_branch_length: number;
  expand_branch_length: number;
  total_branch_length: number;
}

export type TemporalEvent = SplitChangeTemporalEvent | SprMoveTemporalEvent;

export interface PairMetricRow {
  pair_id: string;
  pair_ordinal: number;
  robinson_foulds: number;
  weighted_robinson_foulds: number;
}

export interface PairMetrics {
  rows: PairMetricRow[];
  semantics: {
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
}

export interface MsaData {
  sequences: Record<string, string> | null;
  window_size: number;
  step_size: number;
}

export type SubtreeHighlightTracking = Array<number[][] | null>;

export interface PhyloMovieData {
  interpolated_trees: TreeNode[];
  frames: TimelineFrame[];
  pairs: TimelinePair[];
  temporal_events: TemporalEvent[];
  pivot_edge_tracking: Array<number[] | null>;
  /** Per-frame active mover highlight groups. */
  subtree_highlight_tracking: SubtreeHighlightTracking;
  pair_metrics: PairMetrics;
  msa: MsaData;
  file_name: string;
}
