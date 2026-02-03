import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, FileText, CheckCircle2, XCircle, Info, FileSpreadsheet, Trash2 } from "lucide-react";

export function CSVUpload({ onFile, csvFileName, onReset }) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  if (csvFileName) {
    return (
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="flex items-center justify-between p-4 px-6">
          <div className="flex items-center gap-4">
            <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <FileSpreadsheet className="size-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground line-clamp-1">{csvFileName}</p>
              <p className="text-2xs text-muted-foreground uppercase tracking-wider font-semibold">Active Dataset</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-5 text-emerald-500 mr-2" />
            <Button
               variant="ghost"
               size="icon"
               onClick={onReset}
               className="size-8 rounded-full hover:bg-destructive/10 hover:text-destructive group/reset"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Onboarding Info */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex gap-3 rounded-lg border border-border/50 bg-muted/20 p-3">
          <div className="mt-0.5 rounded-full bg-blue-500/10 p-1.5 text-blue-600 dark:text-blue-400">
            <Info className="size-3.5" />
          </div>
          <div className="space-y-1">
            <p className="text-[11px] font-bold leading-none">Format Requirements</p>
            <p className="text-2xs text-muted-foreground leading-tight">
              One column must contain exactly the same taxa names as in your tree. Other columns define colors/groups.
            </p>
          </div>
        </div>
        <div className="flex gap-3 rounded-lg border border-border/50 bg-muted/20 p-3">
          <div className="mt-0.5 rounded-full bg-amber-500/10 p-1.5 text-amber-600">
            <FileText className="size-3.5" />
          </div>
          <div className="space-y-1">
            <p className="text-[11px] font-bold leading-none">Pro-Tip: Mapping</p>
            <p className="text-2xs text-muted-foreground leading-tight">
              Values like "High", "Low" or "Group A" will be automatically detected as distinct coloring subtrees.
            </p>
          </div>
        </div>
      </div>

      {/* Main Upload Area */}
      <Card
        className={
          "relative border-2 border-dashed transition-all duration-300 group/drop " +
          (dragOver
            ? "border-primary bg-primary/5 ring-4 ring-primary/10 scale-[1.01]"
            : "border-muted-foreground/20 hover:border-primary/50 hover:bg-accent/5")
        }
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files?.[0];
          if (file && file.name.endsWith('.csv')) onFile(file);
        }}
      >
        <CardContent className="flex flex-col items-center justify-center py-6 px-6 text-center">
          <div className="mb-3 rounded-xl bg-primary/10 p-3 transition-transform group-hover/drop:scale-110 group-hover/drop:rotate-3">
             <Upload className="size-6 text-primary" />
          </div>

          <div className="space-y-1.5 mb-5">
            <h3 className="text-sm font-bold tracking-tight">Import Taxa Mapping</h3>
            <p className="text-[11px] text-muted-foreground max-w-[240px] mx-auto leading-tight">
              Drag and drop your <code className="bg-muted px-1 rounded text-primary font-mono font-bold">.csv</code> file here.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
                variant="default"
                size="sm"
                className="h-8 px-5 font-bold shadow-md"
                onClick={() => inputRef.current?.click()}
            >
              Select File
            </Button>
          </div>

          <input
            ref={inputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
          />
        </CardContent>
      </Card>

      <p className="text-center text-2xs text-muted-foreground/60 italic">
        Max file size: 5MB • Privacy: All processing happens locally in your browser.
      </p>
    </div>
  );
}
