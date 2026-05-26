import React from 'react';
import { UploadCloud } from "lucide-react";
import { FileUploadZone } from "../../../../components/ui/file-upload-zone";

export function ProjectFileSection({ treesFile, msaFile, setTreesFile, setMsaFile, disabled }) {
  return (
    <section className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-col gap-2">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            <UploadCloud className="size-4" />
            Input files
          </div>
          <h3 className="mt-2 text-xl font-semibold tracking-tight">Upload project data</h3>
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            Provide an ordered tree series, an alignment for sliding-window inference, or both.
          </p>
        </div>
      </div>
      <div className="grid min-w-0 gap-4 md:grid-cols-2">
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
    </section>
  );
}
