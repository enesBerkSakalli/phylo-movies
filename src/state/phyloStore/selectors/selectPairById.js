let cachedPairs = null;
let cachedPairById = Object.freeze({});

export const selectPairById = (state) => {
  const pairs = state.pairs;
  if (pairs === cachedPairs) return cachedPairById;
  cachedPairs = pairs;
  cachedPairById = Object.fromEntries(pairs.map((pair) => [pair.pair_id, pair]));
  return cachedPairById;
};
