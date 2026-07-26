import { getMsaColumnCount } from '../../../domain/msa/msaSequenceSummary.js';

/** @param {import('../../../types/store').AppStoreState} state */
export const selectMsaColumnCount = (state) => getMsaColumnCount(state.msaSequences);
