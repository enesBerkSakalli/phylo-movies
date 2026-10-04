// Backend tree-inference progress: "Inferred tree 12/100 from 131.fasta"
// (engine/BranchArchitect/msa_to_trees/msa_to_trees/pipeline.py).
const INFERRED_TREE_PATTERN = /^Inferred tree (\d+)\/(\d+)\b/;

/**
 * User-facing progress text: tree inference becomes "Inferring tree 12 of 100"
 * with a time estimate, without the backend's temporary window file names.
 */
export function describeProcessingProgress(message, elapsedMs) {
  const match = typeof message === 'string' ? message.match(INFERRED_TREE_PATTERN) : null;
  if (!match) {
    return { headline: message || 'Processing…', detail: null };
  }

  const completed = Number(match[1]);
  const total = Number(match[2]);
  const headline = `Inferring tree ${completed.toLocaleString()} of ${total.toLocaleString()}`;
  if (!(completed > 0) || !(elapsedMs > 0) || completed >= total) {
    return { headline, detail: null };
  }

  const remainingMs = (elapsedMs / completed) * (total - completed);
  if (remainingMs < 5000) return { headline, detail: 'Almost done' };
  return { headline, detail: `About ${formatDuration(remainingMs)} left` };
}

export function formatDuration(ms) {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  if (totalSeconds < 60) return `${totalSeconds} s`;
  const minutes = Math.round(totalSeconds / 60);
  return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
}

export function formatElapsed(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  return `${minutes}:${String(totalSeconds % 60).padStart(2, '0')}`;
}
