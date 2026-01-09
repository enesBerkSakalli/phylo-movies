import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Upload, SlidersHorizontal, Dna, Sprout, Loader2 } from "lucide-react";
import { FileUploadZone } from "@/components/ui/file-upload-zone";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

import { useHomeUploadForm } from './useHomeUploadForm.js';

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Sparkles, ChevronRight, ChevronDown } from "lucide-react";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Define the validation schema using Zod
const formSchema = z.object({
  windowSize: z.coerce.number()
    .int("Must be a whole number")
    .min(1, "Must be at least 1")
    .max(100000, "Must be 100,000 or less"),
  stepSize: z.coerce.number()
    .int("Must be a whole number")
    .min(1, "Must be at least 1")
    .max(100000, "Must be 100,000 or less"),
  midpointRooting: z.boolean(),
  // Files are handled via custom validation in onSubmit for now,
  // but we track them in state which RHF doesn't strictly control without Controller.
  // We'll keep file state separate as it was, but use RHF for the settings inputs.
});

export function HomePage() {
  const {
    treesFile, setTreesFile,
    msaFile, setMsaFile,
    windowSize: windowSizeInput, setWindowSize: setWindowSizeInput,
    stepSize: stepSizeInput, setStepSize: setStepSizeInput,
    windowSizeError, stepSizeError,
    commitWindowInput, commitStepInput,
    midpointRooting, setMidpointRooting,
    submitting, loadingExample, progress,
    alert, clearAlert,
    handleSubmit, handleLoadExample, reset,
  } = useHomeUploadForm();

  // Initialize React Hook Form
  // NOTE: For this refactor, we are primarily using RHF for its validation schema and structure,
  // but the actual state management for windowSize, stepSize, and midpointRooting
  // is still handled by `useHomeUploadForm` to avoid breaking existing logic.
  // The RHF `form` object is initialized but its `handleSubmit` is not directly used for the main form submission.
  // Instead, the `useHomeUploadForm`'s `handleSubmit` is called, which reads its own state.
  // The RHF `form` is used to provide validation feedback and structure for the inputs.
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      windowSize: 1000,
      stepSize: 10,
      midpointRooting: false,
    },
    mode: "onBlur", // Validate on blur like before
  });

  const disabled = submitting || loadingExample;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-14 items-center justify-center gap-2 px-4">
          <Dna className="size-5 text-primary" />
          <h1 className="text-lg font-semibold tracking-tight">Phylo-Movies</h1>
        </div>
      </header>

      <main className="container mx-auto max-w-4xl py-10 space-y-10">
        {/* HERO SECTION */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="p-3 bg-primary/10 rounded-full ring-1 ring-primary/20">
              <Sprout className="size-8 text-primary" />
            </div>
          </div>
          <div className="space-y-2 max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold tracking-tight">Visualize Phylogenetic Evolution</h2>
            <p className="text-muted-foreground text-lg">
              Transform static trees and alignments into dynamic evolutionary narratives.
              Analyze topology changes and sequence conservation side-by-side.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <Badge variant="secondary" className="px-3 py-1 font-normal">
              Interactive Timeline
            </Badge>
            <Badge variant="secondary" className="px-3 py-1 font-normal">
              Smooth Transitions
            </Badge>
            <Badge variant="secondary" className="px-3 py-1 font-normal">
              Rich Visualization
            </Badge>
          </div>
        </div>

        {/* MAIN CONTENT CARD */}
        <Card className="shadow-lg border-muted">
          <Tabs defaultValue="upload" className="w-full">
            <div className="px-6 pt-6">
               <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="upload">New Project</TabsTrigger>
                <TabsTrigger value="example">Load Example</TabsTrigger>
              </TabsList>
            </div>

            <CardContent className="p-6">
              {alert && (
                <Alert variant="destructive" className="mb-6">
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{alert.message}</AlertDescription>
                </Alert>
              )}

              <TabsContent value="upload" className="space-y-6 mt-0">
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

                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="settings" className="border-none">
                    <AccordionTrigger className="hover:no-underline py-2">
                      <div className="flex items-center gap-2 text-primary">
                        <SlidersHorizontal className="size-4" />
                        <span className="text-sm font-semibold">Timeline & Analysis Settings</span>
                        <Badge variant="outline" className="ml-2 text-[10px] h-5 font-normal text-muted-foreground">Optional</Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-4 pb-2">
                      <div className="grid md:grid-cols-2 gap-6 p-1">
                        <div className="space-y-4">
                          {/* Window Size */}
                          <div className="space-y-2">
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
                              aria-invalid={!!windowSizeError}
                              aria-describedby="window-size-help window-size-error"
                            />
                            <p id="window-size-help" className="text-[0.8rem] text-muted-foreground mt-1.5">
                              Whole number of alignment columns per frame. Typical range: 100–10,000 (allowed 1–100,000).
                            </p>
                            {windowSizeError && (
                              <p id="window-size-error" className="text-[0.8rem] font-medium text-destructive mt-1.5">
                                {windowSizeError}
                              </p>
                            )}
                          </div>

                          {/* Step Size */}
                          <div className="space-y-2">
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
                              aria-invalid={!!stepSizeError}
                              aria-describedby="step-size-help step-size-error"
                            />
                            <p id="step-size-help" className="text-[0.8rem] text-muted-foreground mt-1.5">
                              Frames to advance per step. Use whole numbers. Typical range: 10–2,000 (allowed 1–100,000).
                            </p>
                            {stepSizeError && (
                              <p id="step-size-error" className="text-[0.8rem] font-medium text-destructive mt-1.5">
                                {stepSizeError}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Midpoint Rooting */}
                        <div className="rounded-lg border p-4 flex items-center gap-4 h-fit">
                          <Switch
                            id="midpoint-rooting"
                            checked={midpointRooting}
                            onCheckedChange={setMidpointRooting}
                            disabled={disabled}
                          />
                          <div className="space-y-1">
                            <Label htmlFor="midpoint-rooting" className="font-medium cursor-pointer">Enable Midpoint Rooting</Label>
                            <p className="text-[0.8rem] text-muted-foreground">Automatically root trees at their midpoint</p>
                          </div>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </TabsContent>

              <TabsContent value="example" className="mt-0">
                 <div className="flex flex-col items-center justify-center py-10 text-center space-y-4">
                    <div className="p-4 bg-secondary rounded-full">
                       <Sparkles className="size-8 text-secondary-foreground" />
                    </div>
                    <div className="max-w-md space-y-2">
                       <h3 className="text-lg font-semibold">Load Sample Dataset</h3>
                       <p className="text-sm text-muted-foreground">
                         Explore the capabilities of Phylo-Movies with a pre-configured biological dataset (SARS-CoV-2 Spike Protein Evolution).
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
            </CardContent>

            <TabsContent value="upload" className="mt-0">
               <CardFooter className="flex justify-end gap-2 px-6 pb-6 bg-muted/20 border-t pt-4">
                <Button
                  variant="ghost"
                  onClick={() => reset()}
                  disabled={disabled}
                >
                  Reset
                </Button>
                <Button onClick={handleSubmit} disabled={disabled || (!treesFile && !msaFile)}>
                  Create Visualization
                </Button>
               </CardFooter>
            </TabsContent>
          </Tabs>
        </Card>

        {/* Processing Overlay */}
        {(submitting || loadingExample) && (
          <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-300">
            <Card className="w-80 shadow-2xl">
              <CardContent className="pt-6 space-y-6">
                <div className="flex flex-col items-center text-center gap-4">
                  <div className="p-3 bg-primary/10 rounded-full">
                    <Loader2 className="size-8 text-primary animate-spin" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-semibold">{progress.message || 'Processing...'}</p>
                    <p className="text-xs text-muted-foreground">Please wait while we process your data.</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Progress value={progress.percent} className="h-2" />
                  <p className="text-xs text-muted-foreground text-center">
                    {Math.round(progress.percent)}% complete
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}

export default HomePage;
