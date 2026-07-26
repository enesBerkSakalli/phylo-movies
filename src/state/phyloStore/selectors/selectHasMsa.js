import { hasMsaSequences } from '../../../domain/msa/msaSequenceSummary.js';

/** @param {import('../../../types/store').AppStoreState} state */
export const selectHasMsa = (state) => hasMsaSequences(state.msaSequences);
