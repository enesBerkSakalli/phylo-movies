import { getMsaColumnCount } from '../../../domain/msa/msaSequenceSummary.js';

export const selectMsaColumnCount = (state) => getMsaColumnCount(state.msaSequences);
