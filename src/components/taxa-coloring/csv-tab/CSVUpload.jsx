import React, { useRef, useState } from 'react';
import { CheckCircle2, FileSpreadsheet, FileText, Info, Trash2, Upload } from 'lucide-react';

import { Button } from '../../ui/button';
import { Card, CardContent } from '../../ui/card';
import { Label } from '../../ui/label';

const MAX_TABLE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_TABLE_EXTENSIONS = ['.csv', '.tsv'];

export function CSVUpload({
  onFile,
  metadataSources = [],
  onMetadataSource,
  csvFileName,
  onReset,
  errorMessage,
}) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [hasError, setHasError] = useState(false);

  const inputId = 'taxa-csv-upload';
  const helpId = `${inputId}-help`;
  const statusId = `${inputId}-status`;

  const acceptFile = (file) => {
    if (!file) return;

    const lowerName = file.name.toLowerCase();
    const hasAcceptedExtension = ACCEPTED_TABLE_EXTENSIONS.some((extension) =>
      lowerName.endsWith(extension)
    );
    if (!hasAcceptedExtension) {
      setHasError(true);
      setStatusMessage('Only .csv and .tsv files are accepted.');
      return;
    }

    if (file.size > MAX_TABLE_SIZE) {
      setHasError(true);
      setStatusMessage('File is too large. Maximum size is 5 MB.');
      return;
    }

    setHasError(false);
    setStatusMessage(`Selected CSV file: ${file.name}.`);
    onFile(file);
  };

  if (csvFileName) {
    return (
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="flex items-center justify-between p-4 px-6">
          <div className="flex items-center gap-4">
            <div className="flex size-10 items-center justify-center rounded-md bg-primary/10 text-primary">
              <FileSpreadsheet className="size-5" />
            </div>
            <div>
              <p className="line-clamp-1 text-sm font-bold text-foreground">{csvFileName}</p>
              <p className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
                Active Dataset
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="mr-2 size-5 text-primary" />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setHasError(false);
                setStatusMessage('CSV file cleared.');
                onReset?.();
              }}
              className="group/reset size-8 rounded-md hover:bg-destructive/10 hover:text-destructive"
              aria-label="Remove selected CSV file"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const visibleStatusMessage = hasError ? statusMessage : errorMessage || statusMessage;
  const visibleStatusIsError = hasError || Boolean(errorMessage);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex gap-3 rounded-lg border border-border/50 bg-muted/20 p-3">
          <div className="mt-1 rounded-md bg-primary/10 p-2 text-primary">
            <Info className="size-3.5" />
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-[11px] font-bold leading-none">Format Requirements</p>
            <p className="text-2xs leading-tight text-muted-foreground">
              One column should contain tree taxa, accessions, or accession versions. Other columns
              define colors/groups.
            </p>
          </div>
        </div>
        <div className="flex gap-3 rounded-lg border border-border/50 bg-muted/20 p-3">
          <div className="mt-1 rounded-md bg-accent p-2 text-accent-foreground">
            <FileText className="size-3.5" />
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-[11px] font-bold leading-none">Mapping</p>
            <p className="text-2xs leading-tight text-muted-foreground">
              Augur metadata fields such as country, VP1 type, RdRp type, or year can be selected as
              coloring groups.
            </p>
          </div>
        </div>
      </div>

      <Card
        className={
          'group/drop relative border-2 border-dashed transition-all duration-300 ' +
          (dragOver
            ? 'border-primary bg-primary/5 ring-4 ring-primary/10 scale-[1.01]'
            : 'border-muted-foreground/20 hover:border-primary/50 hover:bg-accent/5')
        }
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          acceptFile(e.dataTransfer.files?.[0]);
        }}
      >
        <CardContent className="flex flex-col items-center justify-center px-6 py-6 text-center">
          <div className="mb-3 rounded-md bg-primary/10 p-3">
            <Upload className="size-6 text-primary" />
          </div>

          <div className="mb-5 flex flex-col gap-2">
            <h3 className="text-sm font-bold tracking-tight">Import Taxa Mapping</h3>
            <div id={helpId} className="flex flex-col gap-1">
              <p className="mx-auto max-w-[280px] text-[11px] leading-tight text-muted-foreground">
                Drag and drop your{' '}
                <code className="rounded bg-muted px-1 font-mono font-bold text-primary">.csv</code>{' '}
                or{' '}
                <code className="rounded bg-muted px-1 font-mono font-bold text-primary">.tsv</code>{' '}
                file here, or use the browse button.
              </p>
              <p className="text-2xs text-muted-foreground/80">
                Keyboard: tab to the browse button and press Enter or Space.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Label htmlFor={inputId} className="sr-only">
              Select taxa metadata table
            </Label>
            <Button
              variant="default"
              size="sm"
              className="h-8 px-5 font-bold"
              onClick={() => inputRef.current?.click()}
            >
              Browse Table
            </Button>
            {metadataSources.map((source) => (
              <Button
                key={source.filePath}
                variant="outline"
                size="sm"
                className="h-8 px-4 font-bold"
                onClick={() => {
                  setHasError(false);
                  setStatusMessage(`Loading metadata table: ${source.fileName}.`);
                  onMetadataSource?.(source);
                }}
              >
                {source.label}
              </Button>
            ))}
          </div>

          <input
            ref={inputRef}
            id={inputId}
            type="file"
            accept=".csv,.tsv,text/csv,text/tab-separated-values"
            className="sr-only"
            aria-describedby={`${helpId} ${statusId}`}
            onChange={(e) => acceptFile(e.target.files?.[0])}
          />
        </CardContent>
      </Card>

      <p
        id={statusId}
        aria-live="polite"
        className={`text-center text-xs ${visibleStatusMessage ? (visibleStatusIsError ? 'text-destructive' : 'text-muted-foreground') : 'sr-only'}`}
      >
        {visibleStatusMessage || 'No CSV file selected.'}
      </p>

      <p className="text-center text-2xs italic text-muted-foreground/60">
        Max file size: 5MB • CSV and TSV supported • Privacy: processing happens locally.
      </p>
    </div>
  );
}
