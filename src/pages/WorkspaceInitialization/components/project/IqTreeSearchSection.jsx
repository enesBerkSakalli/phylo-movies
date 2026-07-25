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
      description={supportsUfboot ? 'UFBoot disables fast search.' : 'Speed versus thoroughness.'}
    >
      <LabeledCheckboxField
        control={control}
        name="iqtreeFastSearch"
        label="IQ-TREE Fast Search"
        description={
          supportsUfboot
            ? 'UFBoot disables IQ-TREE -fast.'
            : 'Use IQ-TREE -fast for responsive runs.'
        }
        disabled={disabled || !hasMsa || supportsUfboot}
        muted={!hasMsa || supportsUfboot}
      />
    </TreeInferenceOptionGroup>
  );
}
