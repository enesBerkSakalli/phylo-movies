/**
 * Data parsing utilities for MSA visualization
 * Handles FASTA parsing and sequence type detection
 */

/**
 * Guesses the sequence type (DNA or protein) from sequence data
 * @param {Array<{id: string, seq: string}>} recs - Array of sequence objects
 * @returns {string} Either 'dna' or 'protein'
 */
function guessTypeFromSeqs(recs) {
  const letters = new Set('ACGTURYSWKMBDHVN-.');
  for (const r of recs) {
    for (const ch of r.seq) {
      if (!letters.has(ch)) return 'protein';
    }
  }
  return 'dna';
}

/**
 * Converts MSA sequence records to internal row format
 * @param {Record<string, string>} sequences - Taxon name to aligned sequence
 * @returns {Array<{id: string, seq: string}>} Array of sequence objects
 */
function convertMsaSequencesToRows(sequences) {
  if (!sequences) {
    return [];
  }

  return Object.entries(sequences).map(([name, seq]) => ({
    id: name,
    seq: seq.toUpperCase(),
  }));
}

/**
 * Processes MSA sequences and returns formatted rows with metadata
 * @param {Record<string, string>} sequences - Taxon name to aligned sequence
 * @returns {object} Processed data with sequences, type, and dimensions
 */
export function processMsaSequences(sequences) {
  if (!sequences) {
    console.warn('[MSADeckGLViewer] No MSA sequences found in data');
    return null;
  }

  // Convert dictionary to array format expected by deck.gl viewer
  const seqs = convertMsaSequencesToRows(sequences);
  const dataType = guessTypeFromSeqs(seqs);

  return {
    sequences: seqs,
    type: dataType,
    rows: seqs.length,
    cols: seqs.length > 0 ? seqs[0].seq.length : 0,
  };
}

/**
 * Calculates the consensus sequence from an array of sequences
 * @param {Array<{id: string, seq: string}>} sequences - Array of sequence objects
 * @returns {string} The consensus sequence string
 */
export function calculateConsensus(sequences) {
  if (!sequences || sequences.length === 0) return '';

  const len = sequences[0].seq.length;
  const consensus = [];

  for (let i = 0; i < len; i++) {
    const counts = {};
    let maxCount = 0;
    let maxChar = '-';

    for (const s of sequences) {
      const ch = s.seq[i];
      if (ch === '-' || ch === undefined) continue;

      counts[ch] = (counts[ch] || 0) + 1;
      if (counts[ch] > maxCount) {
        maxCount = counts[ch];
        maxChar = ch;
      }
    }
    consensus.push(maxChar);
  }

  return consensus.join('');
}
