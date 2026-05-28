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
    .int('Window size must be a whole number of alignment columns.')
    .min(WINDOW_MIN, `Window size must be at least ${WINDOW_MIN} alignment column.`)
    .max(WINDOW_MAX, `Window size must be ${WINDOW_MAX} columns or less.`),
  stepSize: z.coerce
    .number()
    .int('Step size must be a whole number of alignment columns.')
    .min(STEP_MIN, `Step size must be at least ${STEP_MIN} alignment column.`)
    .max(STEP_MAX, `Step size must be ${STEP_MAX} columns or less.`),
  midpointRooting: z.boolean().default(false),
  // Tree inference model options (MSA → trees pipeline)
  treeInferenceEngine: z.enum(['iqtree', 'fasttree']).default('iqtree'),
  iqtreeFastSearch: z.boolean().default(true), // IQ-TREE -fast search mode
  iqtreeSupportMode: z.enum(['none', 'ufboot', 'sh_alrt', 'sh_alrt_ufboot']).default('none'),
  iqtreeUfbootReplicates: z.coerce
    .number()
    .int('UFBoot replicates must be a whole number.')
    .min(100, 'UFBoot requires at least 100 replicates.')
    .max(100000, 'UFBoot replicate count must be 100,000 or less.')
    .default(1000),
  iqtreeShAlrtReplicates: z.coerce
    .number()
    .int('SH-aLRT replicates must be a whole number.')
    .min(100, 'SH-aLRT requires at least 100 replicates.')
    .max(100000, 'SH-aLRT replicate count must be 100,000 or less.')
    .default(1000),
  iqtreeBnni: z.boolean().default(false),
  useGtr: z.boolean().default(true), // GTR (General Time Reversible) model
  useGamma: z.boolean().default(true), // Gamma rate heterogeneity
  usePseudo: z.boolean().default(false), // Pseudocounts for gappy alignments
  noMl: z.boolean().default(true), // Disable ML NNI updates for bifurcating trees
});
