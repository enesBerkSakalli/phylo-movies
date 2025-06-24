/**
 * Constants for MSA Viewer
 */

export const MSA_WINDOW_CONFIG = {
  DEFAULT_WIDTH: 1000,
  DEFAULT_HEIGHT: 600,
  MIN_SIZE: 100,
  BORDER_OFFSET: 4,
  RESIZE_THROTTLE: 100
} as const;

export const MSA_WINBOX_CLASSES = ["no-full", "no-scrollbars"] as const;

export const CONTAINER_STYLES = {
  width: "100%",
  height: "100%",
  overflow: "hidden",
  position: "relative",
  boxSizing: "border-box"
} as const;

export const TEST_MSA_DATA = `>seq1
ATCGATCGATCG
>seq2
ATCGATCGATCG
>seq3
ATCGATCGATCG` as const;