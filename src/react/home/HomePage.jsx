import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Upload, SlidersHorizontal, Dna, Sprout } from "lucide-react";
import { FileUploadZone } from "@/components/ui/file-upload-zone";

import { useHomeUploadForm } from './useHomeUploadForm.js';

export function HomePage() {
  const {
    treesFile, setTreesFile,
    msaFile, setMsaFile,
    windowSize: windowSizeInput, setWindowSize: setWindowSizeInput,
    stepSize: stepSizeInput, setStepSize: setStepSizeInput,
    windowSizeError, stepSizeError,
    commitWindowInput, commitStepInput,
    midpointRooting, setMidpointRooting,
    submitting, loadingExample,
    alert, clearAlert,
    handleSubmit, handleLoadExample, reset,
  } = useHomeUploadForm();

  const disabled = submitting || loadingExample;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center gap-3">
          <Dna className="size-5 text-primary" />
          <h1 className="text-lg font-medium">Phylo-Movies</h1>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="text-center mb-8">
          <Sprout className="size-10 text-primary mb-3 mx-auto" />
          <h2 className="text-2xl font-semibold mb-2">Visualize Phylogenetic Evolution</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto mb-4">
            Turn Newick/JSON trees and MSAs into an interactive movie that animates topology changes, highlights taxa, and syncs alignment windows so you can explore evolutionary transitions with both trees and sequences side by side.
          </p>
          <div className="flex justify-center gap-6 text-sm text-muted-foreground">
            <span>• Interactive Timeline</span>
            <span>• Smooth Transitions</span>
            <span>• Rich Visualization</span>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Upload & Configure</CardTitle>
                <CardDescription>Prepare your phylogenetic data for visualization</CardDescription>
              </div>
              <Upload className="size-5 text-primary shrink-0" />
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {alert && (
              <Alert variant="destructive">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{alert.message}</AlertDescription>
              </Alert>
            )}

            <div className="grid md:grid-cols-2 gap-6">
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

            <Separator />

            <div>
              <div className="flex items-center gap-2 text-primary mb-4">
                <SlidersHorizontal className="size-4" />
                <h3 className="text-sm font-semibold">Visualization Parameters</h3>
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="window-size">Window Size</Label>
                    <Input
                      id="window-size"
                      type="number"
                      min={1}
                      max={100000}
                      step={1}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={windowSizeInput}
                      disabled={disabled}
                      onChange={(e) => setWindowSizeInput(e.target.value)}
                      onBlur={commitWindowInput}
                      className="mt-2"
                      aria-invalid={!!windowSizeError}
                      aria-describedby="window-size-help window-size-error"
                    />
                    <p id="window-size-help" className="text-sm text-muted-foreground mt-1">
                      Whole number of alignment columns per frame. Typical range: 100–10,000 (allowed 1–100,000).
                    </p>
                    {windowSizeError && (
                      <p id="window-size-error" className="text-sm text-destructive mt-1">
                        {windowSizeError}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="step-size">Step Size</Label>
                    <Input
                      id="step-size"
                      type="number"
                      min={1}
                      max={100000}
                      step={1}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={stepSizeInput}
                      disabled={disabled}
                      onChange={(e) => setStepSizeInput(e.target.value)}
                      onBlur={commitStepInput}
                      className="mt-2"
                      aria-invalid={!!stepSizeError}
                      aria-describedby="step-size-help step-size-error"
                    />
                    <p id="step-size-help" className="text-sm text-muted-foreground mt-1">
                      Frames to advance per step. Use whole numbers. Typical range: 10–2,000 (allowed 1–100,000).
                    </p>
                    {stepSizeError && (
                      <p id="step-size-error" className="text-sm text-destructive mt-1">
                        {stepSizeError}
                      </p>
                    )}
                  </div>
                </div>
                <div className="rounded-lg border p-4 flex items-center gap-4">
                  <Switch
                    checked={midpointRooting}
                    onCheckedChange={setMidpointRooting}
                    disabled={disabled}
                  />
                  <div>
                    <p className="font-medium">Enable Midpoint Rooting</p>
                    <p className="text-sm text-muted-foreground">Automatically root trees at their midpoint</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                reset();
              }}
              disabled={disabled}
            >
              Reset
            </Button>
            <Button
              variant="secondary"
              onClick={handleLoadExample}
              disabled={loadingExample || submitting}
            >
              Load Example
            </Button>
            <Button onClick={handleSubmit} disabled={disabled || (!treesFile && !msaFile)}>
              Create Visualization
            </Button>
          </CardFooter>
        </Card>

        {(submitting || loadingExample) && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center">
            <Card className="w-auto">
              <CardContent className="pt-6">
                <p className="text-sm">Loading, please wait...</p>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}

export default HomePage;
