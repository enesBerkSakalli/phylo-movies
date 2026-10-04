import { useEffect, useState } from 'react';
import { readFileSummary } from './windowPlan.js';

/**
 * Reads a selected file once and returns `summarize(text)` for it, or null while
 * reading, for an unreadable file, or when no file is selected.
 */
export function useFileSummary(file, summarize) {
  const [result, setResult] = useState({ file: null, summary: null });

  useEffect(() => {
    if (!file) return undefined;
    let cancelled = false;
    readFileSummary(file, summarize).then((summary) => {
      if (!cancelled) setResult({ file, summary });
    });
    return () => {
      cancelled = true;
    };
  }, [file, summarize]);

  // A result for a previously selected file is stale.
  return result.file === file ? result.summary : null;
}
