import React from 'react';
import { CheckCircle2, Database, Download, Loader2, Play, XCircle } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { EXAMPLE_DATASETS } from '../exampleDatasets.js';

export function ExampleTab({ loadingExample, loadingExampleId, submitting, handleLoadExample }) {
  return (
    <div className="flex min-w-0 flex-col gap-5">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            <Database className="size-4" />
            Built-in examples
          </div>
          <h3 className="mt-2 text-xl font-semibold tracking-tight">Choose a dataset to process</h3>
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            Publication and smoke-test datasets are read-only. Loading an example runs the same
            backend processing path as a new project.
          </p>
        </div>
        <Badge variant="secondary" className="w-fit">
          {EXAMPLE_DATASETS.length} datasets
        </Badge>
      </div>

      <div className="overflow-hidden rounded-lg border bg-card">
        <div className="hidden grid-cols-[minmax(15rem,1.5fr)_0.75fr_0.75fr_0.65fr_minmax(11rem,1fr)_10rem] items-center gap-3 border-b bg-muted/40 px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground lg:grid">
          <span>Dataset</span>
          <span>Workflow</span>
          <span>Scale</span>
          <span>MSA</span>
          <span>Demonstrates</span>
          <span className="text-right">Actions</span>
        </div>
        {EXAMPLE_DATASETS.map((example) => {
          const isLoading = loadingExample && loadingExampleId === example.id;
          const isDisabled = loadingExample || submitting;
          const includesAlignment = example.fileType === 'msa' || !!example.msaFilePath;

          return (
            <div
              key={example.id}
              className="grid min-w-0 gap-4 border-b px-4 py-4 last:border-b-0 hover:bg-muted/30 lg:grid-cols-[minmax(15rem,1.5fr)_0.75fr_0.75fr_0.65fr_minmax(11rem,1fr)_10rem] lg:items-center"
            >
              <div className="flex min-w-0 items-start gap-3">
                <div className="min-w-0">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <h4 className="min-w-0 text-sm font-semibold leading-tight">{example.name}</h4>
                    {example.badge && (
                      <Badge variant="secondary" className="text-2xs">
                        {example.badge}
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {example.description}
                  </p>
                </div>
              </div>

              <div className="grid gap-1 text-xs sm:grid-cols-2 lg:block">
                <span className="font-medium text-muted-foreground lg:hidden">Workflow</span>
                <span>{example.workflow || example.fileType}</span>
              </div>

              <div className="grid gap-1 text-xs sm:grid-cols-2 lg:block">
                <span className="font-medium text-muted-foreground lg:hidden">Scale</span>
                <span>{example.scale || example.fileName}</span>
              </div>

              <div className="flex items-center gap-2 text-xs">
                {includesAlignment ? (
                  <>
                    <CheckCircle2 className="size-4 text-primary" />
                    <span>Included</span>
                  </>
                ) : (
                  <>
                    <XCircle className="size-4 text-muted-foreground" />
                    <span>Trees only</span>
                  </>
                )}
              </div>

              <div className="grid gap-1 text-xs sm:grid-cols-2 lg:block">
                <span className="font-medium text-muted-foreground lg:hidden">Demonstrates</span>
                <div>
                  <p>{example.bestFor}</p>
                </div>
              </div>

              <div className="grid grid-cols-[4.5rem_2rem_2rem] items-center justify-end gap-2 lg:justify-self-end">
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => handleLoadExample(example.id)}
                  disabled={isDisabled}
                  className="w-[4.5rem]"
                >
                  {isLoading ? (
                    <Loader2 className="animate-spin" data-icon="inline-start" />
                  ) : (
                    <Play data-icon="inline-start" />
                  )}
                  Load
                </Button>
                <Button
                  variant="outline"
                  size="icon-sm"
                  asChild
                  title={`Download ${example.fileName}`}
                >
                  <a
                    href={example.filePath}
                    download={example.fileName}
                    aria-label={`Download ${example.fileName}`}
                  >
                    <Download data-icon="inline-start" />
                  </a>
                </Button>
                {example.msaFilePath && (
                  <Button
                    variant="outline"
                    size="icon-sm"
                    asChild
                    title={`Download ${example.msaFileName}`}
                  >
                    <a
                      href={example.msaFilePath}
                      download={example.msaFileName}
                      aria-label={`Download ${example.msaFileName}`}
                    >
                      <Download data-icon="inline-start" />
                    </a>
                  </Button>
                )}
                {!example.msaFilePath && <span className="size-8" aria-hidden="true" />}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
