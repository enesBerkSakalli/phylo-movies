import { hasMsaSequences } from '../../../domain/msa/msaSequenceSummary.js';

export const selectHasMsa = (state) => hasMsaSequences(state.msaSequences);
