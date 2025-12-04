import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Upload } from "lucide-react";

export function CSVUpload({ onFile }) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  return (
    <Card>
      <CardContent className="p-0">
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault(); setDragOver(false);
            const file = e.dataTransfer.files?.[0];
            if (file) onFile(file);
          }}
          className={
            "relative flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-md border-2 border-dashed p-6 text-center transition " +
            (dragOver ? "border-primary ring-2 ring-primary/40" : "border-muted")
          }
        >
          <Upload className="mx-auto size-6 text-primary" />
          <div className="text-sm text-muted-foreground">Drag and drop a CSV file here, or click to browse</div>
          <input ref={inputRef} type="file" accept=".csv" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
          <Button variant="secondary" size="sm" onClick={() => inputRef.current?.click()}>Browse Files</Button>
        </div>
      </CardContent>
    </Card>
  );
}
