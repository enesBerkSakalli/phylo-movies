/**
 * Parses MSA data from various formats
 * @param {string} data - The raw sequence data
 * @param {string} format - The format identifier (auto, fasta, clustal, phylip)
 * @returns {Object|null} - Parsed MSA data or null if parsing failed
 */
export function parseMSA(data, format = "auto") {
  if (!data) return null;

  // Detect format if not specified
  if (format === "auto") {
    if (data.startsWith(">")) {
      format = "fasta";
    } else if (data.includes("CLUSTAL")) {
      format = "clustal";
    } else if (data.match(/^\s*\d+\s+\d+/)) {
      format = "phylip";
    } else {
      console.warn("Could not detect MSA format, defaulting to FASTA");
      format = "fasta";
    }
  }

  // Parse based on detected format
  let sequences = [];

  switch (format.toLowerCase()) {
    case "fasta":
      sequences = parseFasta(data);
      break;
    case "clustal":
      sequences = parseClustal(data);
      break;
    case "phylip":
      sequences = parsePhylip(data);
      break;
    default:
      console.error(`Unsupported MSA format: ${format}`);
      return null;
  }

  return {
    sequences,
    format,
    rawData: data,
  };
}

export function parseFasta(data) {
  const lines = data.split(/\r?\n/);
  const sequences = [];
  let currentId = "";
  let currentSeq = "";
  for (const line of lines) {
    if (line.trim() === "") continue;
    if (line.startsWith(">")) {
      if (currentId && currentSeq) sequences.push({ id: currentId, sequence: currentSeq });
      currentId = line.substring(1).trim();
      currentSeq = "";
    } else {
      currentSeq += line.trim();
    }
  }
  if (currentId && currentSeq) sequences.push({ id: currentId, sequence: currentSeq });
  return sequences;
}

export function parseClustal(data) {
  const lines = data.split(/\r?\n/);
  const sequences = [];
  const seqMap = new Map();
  let i = 0;
  while (i < lines.length && !lines[i].toLowerCase().includes("clustal")) i++;
  i++;
  for (; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === "" || line.startsWith("CLUSTAL") || line.match(/^\s*\*/)) continue;
    const parts = line.split(/\s+/);
    if (parts.length < 2) continue;
    const id = parts[0];
    const seqPart = parts[1];
    if (!seqMap.has(id)) seqMap.set(id, "");
    seqMap.set(id, seqMap.get(id) + seqPart);
  }
  for (const [id, sequence] of seqMap.entries()) sequences.push({ id, sequence });
  return sequences;
}

export function parsePhylip(data) {
  const lines = data.split(/\r?\n/);
  const sequences = [];
  const headerMatch = lines[0].trim().match(/^\s*(\d+)\s+(\d+)/);
  if (!headerMatch) {
    console.error("Invalid PHYLIP format: header not found");
    return [];
  }
  const numSeqs = parseInt(headerMatch[1], 10);
  for (let i = 1; i <= numSeqs && i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === "") continue;
    const idEnd = Math.min(10, line.length);
    const id = line.substring(0, idEnd).trim();
    const sequence = line.substring(idEnd).trim().replace(/\s+/g, "");
    sequences.push({ id, sequence });
  }
  let currentSeq = 0;
  for (let i = numSeqs + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === "") continue;
    if (currentSeq >= sequences.length) currentSeq = 0;
    sequences[currentSeq].sequence += line.trim().replace(/\s+/g, "");
    currentSeq++;
  }
  return sequences;
}