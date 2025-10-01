import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Upload, SlidersHorizontal, Dna, Sprout } from "lucide-react";

export function HomePage() {
  const [treesFile, setTreesFile] = useState(null);
  const [orderFile, setOrderFile] = useState(null);
  const [msaFile, setMsaFile] = useState(null);
  const [windowSize, setWindowSize] = useState(1);
  const [stepSize, setStepSize] = useState(1);
  const [midpointRooting, setMidpointRooting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadingExample, setLoadingExample] = useState(false);
  const [alert, setAlert] = useState(null);
  const [staticDemo, setStaticDemo] = useState(false);

  // Compute base path similar to old page
  const base = useMemo(() => {
    try {
      // vite injects import.meta.env during dev/build
      if (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.BASE_URL) {
        return import.meta.env.BASE_URL;
      }
    } catch {}
    return "/";
  }, []);

  useEffect(() => {
    // Initialize static demo mode (localStorage, GH pages, or file://)
    let defaultStatic = false;
    try {
      const saved = localStorage.getItem("staticDemoMode");
      if (saved === "true" || saved === "false") {
        defaultStatic = saved === "true";
      } else {
        defaultStatic = (location.hostname.endsWith("github.io") || location.protocol === "file:");
      }
    } catch {}
    setStaticDemo(defaultStatic);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("staticDemoMode", staticDemo ? "true" : "false");
    } catch {}
  }, [staticDemo]);

  function showAlert(message, type = "danger") {
    setAlert({ type, message });
  }
  function clearAlert() {
    setAlert(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    clearAlert();
    if (staticDemo) {
      showAlert('Static demo mode is enabled. Use "Load Example" to view the demo dataset.');
      return;
    }
    if (submitting) return;
    if (!treesFile) {
      showAlert("Please select a tree file.");
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("treeFile", treesFile);
      if (orderFile) formData.append("orderFile", orderFile);
      if (msaFile) formData.append("msaFile", msaFile);
      formData.append("windowSize", String(windowSize ?? 1));
      formData.append("windowStepSize", String(stepSize ?? 1));
      formData.append("midpointRooting", midpointRooting ? "on" : "");

      const resp = await fetch("/treedata", { method: "POST", body: formData });
      if (!resp.ok) {
        let errorMsg = "Upload failed!";
        try {
          const jd = await resp.json();
          if (jd && jd.error) errorMsg = jd.error;
        } catch {
          try { errorMsg = await resp.text(); } catch {}
        }
        throw new Error(errorMsg);
      }

      const data = await resp.json();
      if (treesFile && treesFile.name) data.file_name = treesFile.name;

      const localforage = (await import("localforage")).default || (await import("localforage"));
      await localforage.setItem("phyloMovieData", data);

      try {
        const { workflows } = await import("@/js/services/dataService.js");
        const fd = new FormData();
        if (msaFile) fd.append("msaFile", msaFile);
        await workflows.handleMSADataSaving(fd, data);
      } catch (err) {
        // Non-fatal if MSA saving fails
        console.error("[HomePage] MSA workflow error:", err);
      }

      window.location.href = `${base}pages/visualization/`;
    } catch (err) {
      showAlert(err.message || String(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLoadExample() {
    clearAlert();
    setLoadingExample(true);
    try {
      let exampleData = null;
      const candidates = [
        `${base}example.json`,
        "/example.json",
        "example.json",
      ];
      for (const url of candidates) {
        try {
          const resp = await fetch(url);
          if (resp.ok) {
            exampleData = await resp.json();
            break;
          }
        } catch {}
      }
      if (!exampleData) throw new Error("Example data not available");
      if (!exampleData.file_name) exampleData.file_name = "example.json";

      const { phyloData } = await import("@/js/services/dataService.js");
      await phyloData.set(exampleData);
      window.location.href = `${base}pages/visualization/`;
    } catch (err) {
      console.error("[HomePage] Failed to load example:", err);
      showAlert(`Failed to load example: ${err.message || err}`);
    } finally {
      setLoadingExample(false);
    }
  }

  const disabled = staticDemo || submitting || loadingExample;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="mx-auto max-w-[1200px] px-6 py-4 flex items-center gap-3">
          <Dna aria-hidden className="size-5 text-primary" />
          <h1 className="m-0 text-lg font-medium">Phylo-Movies</h1>
        </div>
      </header>

      {/* Content */}
      <main className="bg-background">
        <div className="mx-auto max-w-[800px] px-4 py-6">
          {/* Hero */}
          <section className="text-center mb-10">
            <Sprout aria-hidden className="size-10 text-primary mb-4 inline-block" />
            <h2 className="text-2xl font-medium mb-3">Visualize Phylogenetic Evolution</h2>
            <p className="text-base text-muted-foreground max-w-[600px] mx-auto">
              Transform your phylogenetic data into stunning interactive movies. Upload tree files and watch evolution unfold.
            </p>
            <div className="flex justify-center gap-6 flex-wrap mt-6 text-muted-foreground">
              <div className="flex items-center gap-2">•<span>Interactive Timeline</span></div>
              <div className="flex items-center gap-2">•<span>Smooth Transitions</span></div>
              <div className="flex items-center gap-2">•<span>Rich Visualization</span></div>
            </div>
          </section>

          {/* Static demo banner */}
          {staticDemo && (
            <Alert className="mb-4">
              <AlertTitle>Static demo mode enabled</AlertTitle>
              <AlertDescription>Uploads are disabled. Use "Load Example" to preview the app.</AlertDescription>
            </Alert>
          )}

          {/* Upload & Configure */}
          <Card>
            <CardHeader className="flex flex-row items-center gap-4">
              <div className="flex-1">
                <CardTitle>Upload & Configure</CardTitle>
                <CardDescription>Prepare your phylogenetic data for visualization</CardDescription>
              </div>
              <Upload className="size-5 text-primary" />
            </CardHeader>
            <CardContent>
              {alert && (
                <Alert className="mb-4">
                  <AlertTitle>Upload Error</AlertTitle>
                  <AlertDescription>{alert.message}</AlertDescription>
                </Alert>
              )}

              {/* Toggle */}
              <div className="flex items-center justify-between gap-4 rounded-md border p-3 mb-4">
                <div>
                  <div className="font-medium">Static Demo Mode</div>
                  <div className="text-sm text-muted-foreground">Disable uploads and use example data</div>
                </div>
                <Switch checked={staticDemo} onCheckedChange={setStaticDemo} aria-label="Toggle static demo" />
              </div>

              {/* Upload grid */}
              {!staticDemo && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="upload-grid">
                  <div className="space-y-2">
                    <Label htmlFor="trees-input">Trees (.nwk, .newick, .json)</Label>
                    <Input id="trees-input" type="file" accept=".nwk,.newick,.json" disabled={disabled} onChange={(e) => setTreesFile(e.target.files?.[0] || null)} />
                    <div className="text-xs text-muted-foreground pl-1">Newick or JSON tree file</div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="order-input">Optional Order (.txt)</Label>
                    <Input id="order-input" type="file" accept=".txt,.csv" disabled={disabled} onChange={(e) => setOrderFile(e.target.files?.[0] || null)} />
                    <div className="text-xs text-muted-foreground pl-1">List of taxa to control rendering order</div>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="msa-input">Multiple Sequence Alignment</Label>
                    <Input id="msa-input" type="file" accept=".fas,.fasta,.aln,.clustal,.msa,.phylip,.phy" disabled={disabled} onChange={(e) => setMsaFile(e.target.files?.[0] || null)} />
                    <div className="text-xs text-muted-foreground pl-1">FASTA, CLUSTAL, or PHYLIP format</div>
                  </div>
                </div>
              )}

              <Separator className="my-6" />

              {/* Parameters */}
              <div className="mb-2 flex items-center gap-2 text-primary">
                <SlidersHorizontal className="size-4" />
                <span className="text-sm font-medium">Visualization Parameters</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="window-size">Window Size</Label>
                    <Input id="window-size" type="number" min={1} value={windowSize} disabled={disabled} onChange={(e) => setWindowSize(Math.max(1, Number(e.target.value || 1)))} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="step-size">Step Size</Label>
                    <Input id="step-size" type="number" min={1} value={stepSize} disabled={disabled} onChange={(e) => setStepSize(Math.max(1, Number(e.target.value || 1)))} />
                  </div>
                </div>
                <div className="rounded-lg border p-4">
                  <label className="flex items-center gap-4 cursor-pointer">
                    <Switch checked={midpointRooting} onCheckedChange={setMidpointRooting} disabled={disabled} />
                    <div className="flex-1">
                      <div className="font-medium">Enable Midpoint Rooting</div>
                      <div className="text-sm text-muted-foreground">Automatically root trees at their midpoint</div>
                    </div>
                  </label>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex items-center justify-end gap-2">
              <Button variant="outline" type="button" onClick={() => {
                setTreesFile(null); setOrderFile(null); setMsaFile(null);
                setWindowSize(1); setStepSize(1); setMidpointRooting(false);
                clearAlert();
              }} disabled={disabled}>
                Reset
              </Button>
              <Button variant="secondary" type="button" onClick={handleLoadExample} disabled={loadingExample || submitting}>
                Load Example
              </Button>
              <Button onClick={handleSubmit} disabled={disabled}>
                Create Visualization
              </Button>
            </CardFooter>
          </Card>
        </div>
      </main>

      {/* Overlay */}
      {(submitting || loadingExample) && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center">
          <div className="text-sm text-foreground bg-card/80 backdrop-blur rounded-md px-4 py-2 border">Loading, please wait...</div>
        </div>
      )}
    </div>
  );
}

export default HomePage;
