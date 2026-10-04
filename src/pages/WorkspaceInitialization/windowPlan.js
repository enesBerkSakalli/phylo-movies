/**
 * Sliding-window planning for the upload form: what the alignment looks like,
 * how many windows the backend will cut, and sensible settings for it.
 *
 * Window count mirrors engine/BranchArchitect/msa_to_trees/split_alignment/
 * windowing.py::create_windows_from_parameters: one window centred on every
 * `step` columns, so count = ceil(siteCount / step), independent of window size.
 */

// Reading the file is only for guidance; skip huge files rather than block the UI.
const MAX_SUMMARY_FILE_BYTES = 50 * 1024 * 1024;
const LARGE_WINDOW_COUNT = 100;
const SUGGESTED_WINDOW_FRACTION = 0.2;

/** Sequence count and alignment length from FASTA or PHYLIP text, or null. */
export function summarizeAlignmentText(text) {
  if (typeof text !== 'string') return null;
  const trimmed = text.trimStart();

  if (trimmed.startsWith('>')) {
    let sequenceCount = 0;
    let siteCount = 0;
    let inFirstSequence = false;
    for (const line of trimmed.split(/\r?\n/)) {
      if (line.startsWith('>')) {
        sequenceCount += 1;
        inFirstSequence = sequenceCount === 1;
      } else if (inFirstSequence) {
        siteCount += line.replace(/\s+/g, '').length;
      }
    }
    return sequenceCount > 0 && siteCount > 0 ? { sequenceCount, siteCount } : null;
  }

  const phylipHeader = trimmed.match(/^(\d+)\s+(\d+)/);
  if (phylipHeader) {
    return { sequenceCount: Number(phylipHeader[1]), siteCount: Number(phylipHeader[2]) };
  }

  return null;
}

/** Number of trees in Newick text: one per `;`, ignoring [comments]. */
export function countNewickTrees(text) {
  if (typeof text !== 'string') return null;
  const count = (text.replace(/\[[^\]]*\]/g, '').match(/;/g) || []).length;
  return count > 0 ? count : null;
}

export function countWindows(siteCount, stepSize) {
  if (!(siteCount > 0) || !(stepSize > 0)) return null;
  return Math.ceil(siteCount / stepSize);
}

function roundToNiceSites(value) {
  const unit = value < 100 ? 10 : 50;
  return Math.max(unit, Math.round(value / unit) * unit);
}

/**
 * Settings that fit the data: with uploaded trees, one window per tree;
 * otherwise a window of about a fifth of the alignment, stepping half a window.
 */
export function suggestWindowSettings({ siteCount, treeCount }) {
  if (!(siteCount > 0)) return null;

  if (treeCount > 0) {
    const stepSize = Math.max(1, Math.round(siteCount / treeCount));
    return { windowSize: Math.min(siteCount, stepSize * 2), stepSize };
  }

  const windowSize = Math.min(siteCount, roundToNiceSites(siteCount * SUGGESTED_WINDOW_FRACTION));
  return { windowSize, stepSize: Math.max(1, Math.round(windowSize / 2)) };
}

/** Warnings for the current settings, most important first. */
export function assessWindowPlan({ siteCount, treeCount, windowSize, stepSize }) {
  const windowCount = countWindows(siteCount, stepSize);
  if (windowCount === null) return [];

  const warnings = [];
  if (treeCount > 0 && windowCount !== treeCount) {
    warnings.push(
      `The tree file has ${treeCount} trees but these settings give ${windowCount} windows, ` +
        'so windows will not line up with trees.'
    );
  }
  if (windowSize >= siteCount) {
    warnings.push('The window covers the whole alignment, so every window is identical.');
  }
  if (!(treeCount > 0) && windowCount > LARGE_WINDOW_COUNT) {
    warnings.push(
      `This infers ${windowCount} trees, which can take several minutes. ` +
        'A larger step gives fewer windows.'
    );
  }
  return warnings;
}

export async function readFileSummary(file, summarize) {
  if (!file || typeof file.text !== 'function' || file.size > MAX_SUMMARY_FILE_BYTES) return null;
  try {
    return summarize(await file.text());
  } catch {
    return null;
  }
}
