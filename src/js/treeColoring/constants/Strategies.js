// Strategies.js - Grouping strategy constants and mappings

export const SEPARATION_STRATEGIES = {
  'prefix': { label: 'Prefix', example: 'Species_001_v1 → Species' },
  'suffix': { label: 'Suffix', example: 'Species_001_v1 → v1' },
  'middle': { label: 'Middle', example: 'Species_001_v1 → 001' },
  'first-letter': { label: 'First Letter', example: 'Species_001_v1 → S' },
};

/**
 * Map user-friendly strategy names to internal strategy names
 * @param {string} userStrategy - User-friendly strategy name
 * @returns {string} Internal strategy name
 */
export function mapStrategyName(userStrategy) {
  const strategyMap = {
    'prefix': 'first',
    'suffix': 'last',
    'middle': 'nth-2',
    'first-letter': 'first-letter'
  };

  return strategyMap[userStrategy] || userStrategy;
}