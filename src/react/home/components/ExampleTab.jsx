import React from 'react';
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TabsContent } from "@/components/ui/tabs";

export function ExampleTab({ loadingExample, submitting, handleLoadExample }) {
  return (
    <TabsContent value="example" className="mt-0">
      <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
        <div className="p-4 bg-secondary rounded-md">
          <Sparkles className="size-8 text-secondary-foreground" />
        </div>
        <div className="max-w-md space-y-2">
          <h3 className="text-lg font-semibold">Load Sample Dataset</h3>
          <p className="text-sm text-muted-foreground">
            Explore the capabilities of Phylo-Movies with a pre-configured biological dataset (SARS-CoV-2 Spike Protein Phylogeny).
          </p>
        </div>
        <Button
          size="lg"
          onClick={handleLoadExample}
          disabled={loadingExample || submitting}
          className="mt-4"
        >
          {loadingExample ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
          Load Example Data
        </Button>
      </div>
    </TabsContent>
  );
}
