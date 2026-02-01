import * as z from 'zod';

export const WINDOW_MIN = 1;
export const WINDOW_MAX = 100000;
export const STEP_MIN = 1;
export const STEP_MAX = 100000;

export const homeFormSchema = z.object({
  treesFile: z.any().optional(),
  msaFile: z.any().optional(),
  orderFile: z.any().optional(),
  windowSize: z.coerce.number()
    .int("Must be a whole number")
    .min(WINDOW_MIN, `Must be at least ${WINDOW_MIN}`)
    .max(WINDOW_MAX, `Must be ${WINDOW_MAX} or less`),
  stepSize: z.coerce.number()
    .int("Must be a whole number")
    .min(STEP_MIN, `Must be at least ${STEP_MIN}`)
    .max(STEP_MAX, `Must be ${STEP_MAX} or less`),
  midpointRooting: z.boolean().default(false),
  // Tree inference model options (MSA → trees pipeline)
  useGtr: z.boolean().default(true),  // GTR (General Time Reversible) model
  useGamma: z.boolean().default(true), // Gamma rate heterogeneity
  usePseudo: z.boolean().default(false), // Pseudocounts for gappy alignments
});
