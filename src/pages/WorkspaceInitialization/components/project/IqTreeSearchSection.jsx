import React from 'react';
import { useFormContext } from 'react-hook-form';
import { Gauge } from 'lucide-react';

import { TreeInferenceOptionGroup } from './TreeInferenceOptionGroup.jsx';
import { LabeledCheckboxField } from './LabeledCheckboxField.jsx';

export function IqTreeSearchSection({ hasMsa, disabled, supportsUfboot }) {
  const { control } = useFormContext();

  return (
    <TreeInferenceOptionGroup
      icon={Gauge}
      title="Search strategy"
      description={
        supportsUfboot
          ? 'UFBoot runs its own thorough search, so fast search is off.'
          : 'Trade speed for how hard IQ-TREE searches for the best tree.'
      }
    >
      <LabeledCheckboxField
        control={control}
        name="iqtreeFastSearch"
        label="IQ-TREE Fast Search"
        description={
          supportsUfboot
            ? 'Turned off while UFBoot is selected.'
            : 'Much faster; may miss the best tree on difficult windows. Turn off for final analyses.'
        }
        disabled={disabled || !hasMsa || supportsUfboot}
        muted={!hasMsa || supportsUfboot}
      />
    </TreeInferenceOptionGroup>
  );
}
