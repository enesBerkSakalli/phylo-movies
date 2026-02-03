import React from 'react';
import { useFormContext } from 'react-hook-form';
import { SlidersHorizontal } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

import { ProjectFileSection } from './project/ProjectFileSection.jsx';
import { AlignmentAnalysisSection } from './project/AlignmentAnalysisSection.jsx';
import { TreeProcessingSection } from './project/TreeProcessingSection.jsx';
import { ProjectActionFooter } from './project/ProjectActionFooter.jsx';

export function NewProjectTab({
  disabled: globalDisabled,
  reset
}) {
  const { watch, control, setValue } = useFormContext();
  
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

      <Separator />

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary">
            <SlidersHorizontal className="size-4" />
            <h3 className="text-sm font-semibold uppercase tracking-wider">Analysis Settings</h3>
          </div>
          <Badge variant="outline" className="text-2xs h-5 font-normal text-muted-foreground uppercase tracking-widest">
            Configuration
          </Badge>
        </div>

        <div className="grid md:grid-cols-2 gap-8 px-1">
          <AlignmentAnalysisSection
            control={control}
            hasMsa={hasMsa}
            disabled={globalDisabled}
          />

          <TreeProcessingSection
            control={control}
            hasTrees={hasTrees}
            hasMsa={hasMsa}
            disabled={globalDisabled}
          />
        </div>
      </div>

      <ProjectActionFooter
        disabled={globalDisabled}
        reset={reset}
        canSubmit={canSubmit}
      />
    </TabsContent>
  );
}
