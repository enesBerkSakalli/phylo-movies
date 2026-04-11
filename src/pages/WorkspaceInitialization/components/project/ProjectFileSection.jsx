import React from 'react';
import { LayoutPanelLeft } from "lucide-react";
import { FileUploadZone } from "@/components/ui/file-upload-zone";

export function ProjectFileSection({ treesFile, msaFile, setTreesFile, setMsaFile, disabled }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-muted-foreground mb-1">
        <LayoutPanelLeft className="size-4" />
        <h3 className="text-sm font-semibold uppercase tracking-wider">File Selection</h3>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <FileUploadZone
          id="trees-input"
          label="Trees (.nwk, .newick, .json)"
          description="Newick or JSON tree file (optional if MSA provided)"
          disabled={disabled}
          value={treesFile}
          onFileSelect={setTreesFile}
        />

        <FileUploadZone
          id="msa-input"
          label="Multiple Sequence Alignment"
          description="FASTA, CLUSTAL, or PHYLIP format (optional if trees provided)"
          accept={{
            'text/plain': ['.fas', '.fasta', '.aln', '.clustal', '.msa', '.phylip', '.phy']
          }}
          disabled={disabled}
          value={msaFile}
          onFileSelect={setMsaFile}
        />
      </div>
    </div>
  );
}
