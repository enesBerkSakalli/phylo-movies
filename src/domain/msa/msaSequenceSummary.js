export function hasMsaSequences(sequences) {
  return !!(sequences && Object.keys(sequences).length > 0);
}

export function getMsaColumnCount(sequences) {
  if (!hasMsaSequences(sequences)) return 0;
  const firstSequence = Object.values(sequences)[0];
  return typeof firstSequence === 'string' ? firstSequence.length : 0;
}
