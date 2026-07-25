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
      title="FastTree-only options"
      description="FastTree-specific flags."
    >
      <LabeledCheckboxField
        control={control}
        name="usePseudo"
        label="Pseudocounts"
        description={
          <>
            Sends FastTree <code>-pseudo</code>.
          </>
        }
        disabled={disabled || !hasMsa}
        muted={!hasMsa}
      />

      <LabeledCheckboxField
        control={control}
        name="noMl"
        label="Skip ML Optimization"
        description={
          <>
            Sends FastTree <code>-noml</code>.
          </>
        }
        disabled={disabled || !hasMsa}
        muted={!hasMsa}
      />
    </TreeInferenceOptionGroup>
  );
}
