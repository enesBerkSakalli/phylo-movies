import React from 'react';
import { useFormContext } from 'react-hook-form';
import { Trees } from "lucide-react";
import { cn } from '../../../../lib/utils';
import { MsaRequiredBadge } from './MsaRequiredBadge.jsx';
import { TreeInferenceEngineField } from './TreeInferenceEngineField.jsx';
import { IqTreeSearchSection } from './IqTreeSearchSection.jsx';
import { SubstitutionModelSection } from './SubstitutionModelSection.jsx';
import { IqTreeSupportSection } from './IqTreeSupportSection.jsx';
import { FastTreeOptionsSection } from './FastTreeOptionsSection.jsx';

export function TreeConstructionSection({ hasMsa, disabled, embedded = false }) {
  const { watch } = useFormContext();
  const treeInferenceEngine = watch('treeInferenceEngine') || 'iqtree';
  const iqtreeSupportMode = watch('iqtreeSupportMode') || 'none';
  const isFastTree = treeInferenceEngine === 'fasttree';
  const isIqTree = treeInferenceEngine === 'iqtree';
  const supportsUfboot = ['ufboot', 'sh_alrt_ufboot'].includes(iqtreeSupportMode);
  const supportsShAlrt = ['sh_alrt', 'sh_alrt_ufboot'].includes(iqtreeSupportMode);

  return (
    <section
      className={cn(
        'flex min-w-0 flex-col gap-4 transition-colors',
        embedded ? '' : 'rounded-md border p-4',
        !embedded && (!hasMsa ? 'border-dashed bg-muted/30' : 'bg-card')
      )}
    >
      {!embedded && (
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Trees className={cn('size-4', !hasMsa ? 'text-muted-foreground' : 'text-primary')} />
            <h3 className="text-sm font-semibold">
              Tree Inference
            </h3>
          </div>
          {!hasMsa && (
            <MsaRequiredBadge description="Inference settings only apply when an MSA file is uploaded." />
          )}
        </div>
      )}

      <p className="text-2xs text-muted-foreground leading-relaxed">
        Engine and inference options for each MSA window.
      </p>

      <TreeInferenceEngineField
        hasMsa={hasMsa}
        disabled={disabled}
        isFastTree={isFastTree}
      />

      <div className="flex flex-col gap-3">
        {isIqTree && (
          <IqTreeSearchSection
            hasMsa={hasMsa}
            disabled={disabled}
            supportsUfboot={supportsUfboot}
          />
        )}

        <SubstitutionModelSection
          hasMsa={hasMsa}
          disabled={disabled}
        />

        {isIqTree && (
          <IqTreeSupportSection
            hasMsa={hasMsa}
            disabled={disabled}
            supportMode={iqtreeSupportMode}
            supportsUfboot={supportsUfboot}
            supportsShAlrt={supportsShAlrt}
          />
        )}

        {isFastTree && (
          <FastTreeOptionsSection
            hasMsa={hasMsa}
            disabled={disabled}
          />
        )}
      </div>

      {!embedded && (
        <p className="text-2xs text-muted-foreground italic leading-tight">
          Upload an MSA to infer trees here. If you upload precomputed trees only, this section is skipped.
        </p>
      )}
    </section>
  );
}
