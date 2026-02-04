import React from 'react';
import { Sparkles, Loader2, FileText, BookOpen, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { EXAMPLE_DATASETS } from '../exampleDatasets.js';

export function ExampleTab({ loadingExample, loadingExampleId, submitting, handleLoadExample }) {
  return (
    <TabsContent value="example" className="mt-0">
      <div className="space-y-6 py-4">
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="p-3 bg-secondary rounded-md">
            <Sparkles className="size-6 text-secondary-foreground" />
          </div>
          <h3 className="text-lg font-semibold">Load Sample Dataset</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            Explore Phylo-Movies with curated biological datasets from our publication.
          </p>
        </div>

        <div className="space-y-3">
          {EXAMPLE_DATASETS.map((example) => {
            const isLoading = loadingExample && loadingExampleId === example.id;
            const isDisabled = loadingExample || submitting;

            return (
              <div
                key={example.id}
                className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="p-2 bg-primary/10 rounded-md shrink-0">
                  <FileText className="size-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{example.name}</h4>
                    {example.badge && (
                      <Badge variant="secondary" className="text-xs">
                        {example.badge}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {example.description}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    {example.fileType === 'msa' ? (
                      <>
                        <span>Window: {example.parameters.windowSize}</span>
                        <span>Step: {example.parameters.stepSize}</span>
                      </>
                    ) : (
                      <span>File: {example.fileName}</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    asChild
                    title={`Download ${example.fileName}`}
                  >
                    <a href={example.filePath} download={example.fileName}>
                      <Download className="size-4" />
                    </a>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleLoadExample(example.id)}
                    disabled={isDisabled}
                  >
                    {isLoading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      'Load'
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {EXAMPLE_DATASETS.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <BookOpen className="size-8 mx-auto mb-2 opacity-50" />
            <p>No example datasets available.</p>
          </div>
        )}
      </div>
    </TabsContent>
  );
}
