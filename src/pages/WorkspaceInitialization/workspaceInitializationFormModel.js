import * as z from 'zod';

export const WINDOW_MIN = 1;
export const WINDOW_MAX = 100000;
export const STEP_MIN = 1;
export const STEP_MAX = 100000;

export const workspaceInitializationFormSchema = z.object({
  treesFile: z.any().optional(),
  msaFile: z.any().optional(),
  windowSize: z.coerce
    .number()
    .int('Must be a whole number')
    .min(WINDOW_MIN, `Must be at least ${WINDOW_MIN}`)
    .max(WINDOW_MAX, `Must be ${WINDOW_MAX} or less`),
  stepSize: z.coerce
    .number()
    .int('Must be a whole number')
    .min(STEP_MIN, `Must be at least ${STEP_MIN}`)
    .max(STEP_MAX, `Must be ${STEP_MAX} or less`),
  midpointRooting: z.boolean().default(false),
  // Tree inference model options (MSA → trees pipeline)
  treeInferenceEngine: z.enum(['iqtree', 'fasttree']).default('iqtree'),
  iqtreeFastSearch: z.boolean().default(true), // IQ-TREE -fast search mode
  iqtreeSupportMode: z.enum(['none', 'ufboot', 'sh_alrt', 'sh_alrt_ufboot']).default('none'),
  iqtreeUfbootReplicates: z.coerce.number().int().min(100).max(100000).default(1000),
  iqtreeShAlrtReplicates: z.coerce.number().int().min(100).max(100000).default(1000),
  iqtreeBnni: z.boolean().default(false),
  useGtr: z.boolean().default(true), // GTR (General Time Reversible) model
  useGamma: z.boolean().default(true), // Gamma rate heterogeneity
  usePseudo: z.boolean().default(false), // Pseudocounts for gappy alignments
  noMl: z.boolean().default(true), // Disable ML NNI updates for bifurcating trees
});
