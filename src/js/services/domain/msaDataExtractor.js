/**
 * Service for extracting MSA-related data from movie data
 */

/**
 * Extracts MSA column count from movie data sequences
 * @param {Object} movieData - Movie data object
 * @returns {number} Number of columns in MSA sequences, or 0 if unavailable
 */
export function extractMsaColumnCount(movieData) {
  const seqDict = movieData?.msa?.sequences;
  const firstSeq = seqDict ? Object.values(seqDict)[0] : null;
  return typeof firstSeq === 'string' ? firstSeq.length : 0;
}

/**
 * Extracts MSA window parameters from movie data
 * @param {Object} movieData - Movie data object
 * @returns {Object} Window parameters { windowSize, stepSize }
 */
export function extractMsaWindowParameters(movieData) {
  const windowSize = movieData.window_size || movieData.msa?.window_size || 1000;
  const stepSize = movieData.window_step_size || movieData.msa?.step_size || 50;
  return { windowSize, stepSize };
}

/**
 * Checks if movie data contains MSA information
 * @param {Object} movieData - Movie data object
 * @returns {boolean} True if MSA data is present
 */
export function hasMsaData(movieData) {
  return !!(movieData?.msa && movieData.msa.sequences && Object.keys(movieData.msa.sequences).length > 0);
}
