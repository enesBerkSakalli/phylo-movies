import React from 'react';
import { useFormContext } from 'react-hook-form';
import { Wrench } from 'lucide-react';

import { TreeInferenceOptionGroup } from './TreeInferenceOptionGroup.jsx';
import { LabeledCheckboxField } from './LabeledCheckboxField.jsx';

export function FastTreeOptionsSection({ hasMsa, disabled }) {
  const { control } = useFormContext();

  return (
    <TreeInferenceOptionGroup
      icon={Wrench}
      title="FastTree options"
      description="Only used when FastTree is the engine."
    >
      <LabeledCheckboxField
        control={control}
        name="usePseudo"
        label="Pseudocounts"
        description="Stabilises distances for gappy alignments or short windows."
        disabled={disabled || !hasMsa}
        muted={!hasMsa}
      />

      <LabeledCheckboxField
        control={control}
        name="noMl"
        label="Skip ML optimization (faster)"
        description="Keeps the quick distance-based tree, so branch lengths are approximate. Turn off for more accurate trees."
        disabled={disabled || !hasMsa}
        muted={!hasMsa}
      />
    </TreeInferenceOptionGroup>
  );
}
