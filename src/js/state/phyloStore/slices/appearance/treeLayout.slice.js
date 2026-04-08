export const createTreeLayoutSlice = (set) => ({
  // ==========================================================================
  // STATE
  // ==========================================================================
  branchTransformation: 'none',
  layoutAngleDegrees: 360,
  layoutRotationDegrees: 0,

  // ==========================================================================
  // ACTIONS
  // ==========================================================================
  setBranchTransformation: (transform) => set({ branchTransformation: transform }),

  setLayoutAngleDegrees: (degrees) => {
    const value = Number.isFinite(degrees) ? degrees : 360;
    set({ layoutAngleDegrees: value });
  },

  setLayoutRotationDegrees: (degrees) => {
    const value = Number.isFinite(degrees) ? degrees : 0;
    set({ layoutRotationDegrees: value });
  },
});
