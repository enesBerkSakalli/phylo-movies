/**
 * FASTA parser function
 * @param {string} fastaString FASTA format string to parse
 * @returns {Array} Array of sequence objects with id and sequence properties
 */
export function parseFasta(fastaString) {
  if (!fastaString) return [];
  
  const sequences = [];
  const chunks = fastaString.split('>').filter(Boolean);
  
  chunks.forEach(chunk => {
    const lines = chunk.split('\n');
    const id = lines[0].trim();
    const sequence = lines.slice(1).join('').replace(/\s/g, '');
    sequences.push({ id, sequence });
  });
  
  return sequences;
}

/**
 * Newick parser function
 * @param {string} newickString Newick format string to parse
 * @returns {Array} Array of parsed tree strings
 */
export function parseNewick(newickString) {
  if (!newickString) return [];
  
  // Simple parsing - split by semicolon and filter empty strings
  return newickString.split(';')
    .map(tree => tree.trim())
    .filter(tree => tree.length > 0);
}

/**
 * Parse MSA data from localStorage
 * @returns {Object|null} MSA data object or null if not found
 */
export function getMSADataFromStorage() {
  try {
    const storedData = localStorage.getItem('phyloMovieMSAData');
    if (!storedData) return null;
    
    const parsed = JSON.parse(storedData);
    
    // Handle different data structures
    if (parsed.rawData && typeof parsed.rawData === 'string') {
      return parsed;
    } 
    else if (parsed.sequences && Array.isArray(parsed.sequences)) {
      const fastaString = parsed.sequences
        .map(seq => `>${seq.id}\n${seq.sequence}`)
        .join('\n');
      
      return {
        rawData: fastaString,
        sequences: parsed.sequences
      };
    }
    else if (typeof parsed === 'string') {
      return {
        rawData: parsed,
        sequences: parseFasta(parsed)
      };
    }
    
    return null;
  } catch (e) {
    console.error('Error parsing MSA data from storage:', e);
    return null;
  }
}