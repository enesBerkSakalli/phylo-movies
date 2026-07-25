import React from 'react';
import { useFormContext } from 'react-hook-form';
import { Trees } from 'lucide-react';
import { MsaGatedFormSection } from './MsaGatedFormSection.jsx';
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
    <MsaGatedFormSection
      icon={Trees}
      title="Tree Inference"
      badgeDescription="Inference settings only apply when an MSA file is uploaded."
      description="Engine and inference options for each MSA window."
      footnote="Upload an MSA to infer trees here. If you upload precomputed trees only, this section is skipped."
      hasMsa={hasMsa}
      embedded={embedded}
    >
      <TreeInferenceEngineField hasMsa={hasMsa} disabled={disabled} isFastTree={isFastTree} />

      <div className="flex flex-col gap-3">
        {isIqTree && (
          <IqTreeSearchSection
            hasMsa={hasMsa}
            disabled={disabled}
            supportsUfboot={supportsUfboot}
          />
        )}

        <SubstitutionModelSection hasMsa={hasMsa} disabled={disabled} />

        {isIqTree && (
          <IqTreeSupportSection
            hasMsa={hasMsa}
            disabled={disabled}
            supportMode={iqtreeSupportMode}
            supportsUfboot={supportsUfboot}
            supportsShAlrt={supportsShAlrt}
          />
        )}

        {isFastTree && <FastTreeOptionsSection hasMsa={hasMsa} disabled={disabled} />}
      </div>
    </MsaGatedFormSection>
  );
}
