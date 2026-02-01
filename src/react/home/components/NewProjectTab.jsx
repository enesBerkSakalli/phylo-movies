import React from 'react';
import { SlidersHorizontal } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

import { ProjectFileSection } from './project/ProjectFileSection.jsx';
import { AlignmentAnalysisSection } from './project/AlignmentAnalysisSection.jsx';
import { TreeProcessingSection } from './project/TreeProcessingSection.jsx';
import { ProjectActionFooter } from './project/ProjectActionFooter.jsx';

export function NewProjectTab({
  form,
  treesFile,
  msaFile,
  setTreesFile,
  setMsaFile,
  disabled: globalDisabled,
  reset
}) {
  const hasMsa = !!msaFile;
  const hasTrees = !!treesFile;
  const canSubmit = hasMsa || hasTrees;

  return (
    <TabsContent value="upload" className="space-y-8 mt-0 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <ProjectFileSection
        treesFile={treesFile}
        msaFile={msaFile}
        setTreesFile={setTreesFile}
        setMsaFile={setMsaFile}
        disabled={globalDisabled}
      />

      <Separator />

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary">
            <SlidersHorizontal className="size-4" />
            <h3 className="text-sm font-semibold uppercase tracking-wider">Analysis Settings</h3>
          </div>
          <Badge variant="outline" className="text-[10px] h-5 font-normal text-muted-foreground uppercase tracking-widest">
            Configuration
          </Badge>
        </div>

        <div className="grid md:grid-cols-2 gap-8 px-1">
          <AlignmentAnalysisSection
            control={form.control}
            hasMsa={hasMsa}
            disabled={globalDisabled}
          />

          <TreeProcessingSection
            control={form.control}
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
