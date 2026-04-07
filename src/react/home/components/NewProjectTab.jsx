import React from 'react';
import { useFormContext } from 'react-hook-form';
import { TabsContent } from "@/components/ui/tabs";

import { ProjectFileSection } from './project/ProjectFileSection.jsx';
import { SlidingWindowSection } from './project/SlidingWindowSection.jsx';
import { TreeConstructionSection } from './project/TreeConstructionSection.jsx';
import { ProjectActionFooter } from './project/ProjectActionFooter.jsx';

export function NewProjectTab({
  disabled: globalDisabled,
  reset
}) {
  const { watch, setValue } = useFormContext();
  
  const msaFile = watch('msaFile');
  const treesFile = watch('treesFile');

  const hasMsa = !!msaFile;
  const hasTrees = !!treesFile;
  const canSubmit = hasMsa || hasTrees;

  return (
    <TabsContent value="upload" className="space-y-8 mt-0 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <ProjectFileSection
        treesFile={treesFile}
        msaFile={msaFile}
        setTreesFile={(f) => setValue('treesFile', f, { shouldValidate: true })}
        setMsaFile={(f) => setValue('msaFile', f, { shouldValidate: true })}
        disabled={globalDisabled}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <SlidingWindowSection
          hasMsa={hasMsa}
          disabled={globalDisabled}
        />
        <TreeConstructionSection
          hasMsa={hasMsa}
          hasTrees={hasTrees}
          disabled={globalDisabled}
        />
      </div>

      <ProjectActionFooter
        disabled={globalDisabled}
        reset={reset}
        canSubmit={canSubmit}
      />
    </TabsContent>
  );
}
