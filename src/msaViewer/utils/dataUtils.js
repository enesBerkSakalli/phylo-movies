/**
 * Data parsing utilities for MSA visualization
 * Handles FASTA parsing and sequence type detection
 */

/**
 * Parses FASTA-aligned sequences from a string
 * @param {string} fasta - FASTA formatted string
 * @returns {Array<{id: string, seq: string}>} Array of sequence objects
 * @throws {Error} If sequences have different lengths or no sequences found
 */
export function parseFastaAligned(fasta) {
  const lines = (fasta || '').trim().split(/\r?\n/);
  const recs = [];
  let id = null;
  let seq = [];

  for (const line of lines) {
    if (!line) continue;
    if (line[0] === '>') {
      if (id) recs.push({ id, seq: seq.join('').toUpperCase() });
      id = line.slice(1).trim();
      seq = [];
    } else {
      seq.push(line.trim());
    }
  }

  if (id) recs.push({ id, seq: seq.join('').toUpperCase() });
  if (!recs.length) throw new Error('No sequences parsed.');

  const L = recs[0].seq.length;
  for (const r of recs) {
    if (r.seq.length !== L) {
      throw new Error(`Sequences must be equal length (got ${L} and ${r.seq.length}).`);
    }
  }
  return recs;
}

/**
 * Guesses the sequence type (DNA or protein) from sequence data
 * @param {Array<{id: string, seq: string}>} recs - Array of sequence objects
 * @returns {string} Either 'dna' or 'protein'
 */
export function guessTypeFromSeqs(recs) {
  const letters = new Set('ACGTU-');
  for (const r of recs) {
    for (const ch of r.seq) {
      if (!letters.has(ch)) return 'protein';
    }
  }
  return 'dna';
}

/**
 * Converts phylo data format to internal sequence format
 * @param {object} data - Phylo data with msa.sequences
 * @returns {Array<{id: string, seq: string}>} Array of sequence objects
 */
export function convertPhyloToSequences(data) {
  if (!data?.msa?.sequences) {
    return [];
  }

  return Object.entries(data.msa.sequences).map(([name, seq]) => ({
    id: name,
    seq: seq.toUpperCase()
  }));
}

/**
 * Processes phylo data and returns formatted sequences with metadata
 * @param {object} data - Raw phylo data
 * @returns {object} Processed data with sequences, type, and dimensions
 */
export function processPhyloData(data) {
  if (!data?.msa?.sequences) {
    console.warn('[MSADeckGLViewer] No MSA sequences found in data');
    return null;
  }

  // Convert dictionary to array format expected by deck.gl viewer
  const seqs = convertPhyloToSequences(data);
  const dataType = guessTypeFromSeqs(seqs);

  return {
    sequences: seqs,
    type: dataType,
    rows: seqs.length,
    cols: seqs.length > 0 ? seqs[0].seq.length : 0
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
