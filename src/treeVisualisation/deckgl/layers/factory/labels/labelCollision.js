/**
 * Priority of the rank-th branch value (layout order); a value is hidden by every higher-priority
 * value it overlaps, so equal priorities in layout order would leave one survivor per crowd.
 * Reversing the rank's bits makes odd ranks outrank even ones, then every 4th outranks every
 * 2nd, and so on: crowds thin to evenly spaced values, and each coarser set stays visible as
 * zooming reveals the finer one.
 */
export function rankedPriority(rank) {
  let bits = Number.isInteger(rank) && rank > 0 ? rank : 0;
  let reversed = 0;
  for (let i = 0; i < 16; i += 1, bits >>= 1) reversed = (reversed << 1) | (bits & 1);
  return reversed;
}
